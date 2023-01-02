const { MemoryCache } = require("./memoryCache")
const { FileCache } = require("./fileCache")
const constants = require("./constants")
const utils = require("./utils")

class Cache {
  constructor(options = {}) {
    const {
      maxSize = constants.SIZE.M2,
      dists = [.6, .4],
      sizeLimitM = constants.SIZE.K128,
      sizeLimitF = constants.SIZE.K128,
      sizeCalcM = utils._size_def_in_memory,
      sizeCalcF = utils._size_def_in_file,
      fileCacheNum = 3,
      fileCacheUpInterval = 20
    } = options

    const positiveCheck = [maxSize, sizeLimitM, sizeLimitF, fileCacheNum]
    for (let _ of positiveCheck){
      if (!utils.isPosInt(_))
        throw new Error("must be an positive number")
    }

    if (!(Array.isArray(dists) && dists.length === 2 && dists[0] + dists[1] === 1))
      throw new Error("invalid allocation ratio for level-1 and level-2 cache")

    if (maxSize * dists[0] < sizeLimitM || maxSize * dists[1] < sizeLimitF)
      throw new Error("size limit can not outweigh size storage")

    this.maxSizeM = Math.floor(maxSize * dists[0])  // 内存缓存容量
    this.maxSizeF = Math.floor(maxSize * dists[1])  // 磁盘缓存容量
    this.sizeLimitM = sizeLimitM                    // 内存单对象大小上限
    this.sizeLimitF = sizeLimitF                     // 磁盘单对象大小上限
    this.sizeCalcM = typeof sizeCalcM !== "function" ? utils._size_def_in_memory : sizeCalcM
    this.sizeCalcF = typeof sizeCalcF !== "function" ? utils._size_def_in_file : sizeCalcF
    this.fileCacheNum = fileCacheNum                // 磁盘缓存的文件数量
    this.fileMaxSize = Math.floor(this.maxSizeF / this.fileCacheNum)  // 单个磁盘文件大小

    this.mc = new MemoryCache(
      { maxSize: this.maxSizeM, maxSizeSingle: sizeLimitM, sizeCalculation: this.sizeCalcM }
    )
    
    this.fc = new FileCache(
      {
        fileMaxSize: this.fileMaxSize, fileNumber: this.fileCacheNum,
        cachedThreshold: this.sizeLimitF, sizeCalculation: this.sizeCalcF,
        moveToMcInterval: fileCacheUpInterval
      }
    )

    console.log("The initialization of cache was done with configuration:\n")
    console.log(`MemoryCache - total(${this.maxSizeM} bytes) - single limit(${this.sizeLimitM} bytes)`)
    console.log(`FileCache - total(${this.fileMaxSize * this.fileCacheNum} bytes) - single limit(${this.sizeLimitF} bytes) - ${fileCacheNum} readyFiles in ${__dirname}\\cacheFiles`)
  }

  get(k) {
    return new Promise(async (resolve, reject) => {
      try {
        // 内存缓存查找
        const mcVal = this.mc.get(k)

        if (mcVal === undefined) {
          // 磁盘缓存查找
          const fcVal = await this.fc.get(k, 0)

          if (fcVal !== undefined && this.fc.moveToMcCooldown === 0) {
            // 磁盘缓存对象跃升
            const kv = await this.fc.upper()
            this.fc.moveToMcCooldown = this.fc.moveToMcInterval

            if (kv !== undefined) 
              this.mc.set(kv[0], kv[1])
          }
          resolve(fcVal)
        }
        else 
          resolve(mcVal)
      } catch (err) { reject(err) }
    })
  }

  set(k, v) {
    return new Promise(async (resolve, reject) => {
      try {
        if (await this.fc.get(k, 1) !== undefined)
          await this.fc.set(k, v)
        else
          this.mc.set(k, v)
        
        const keys = Object.keys(this.mc.toMove)
        const vals = Object.values(this.mc.toMove)

        for (let i in keys) {
          // 从内存缓存中移除的元素放入磁盘缓存
          if (!await this.fc.set(keys[i], vals[i])) resolve(false)
        }
        if (keys.length)
          this.mc.toMove = {}

        resolve(true)
      } catch (err) { reject(err) }
    })
  }

  delete(k) {
    return new Promise(async (resovle, reject) => {
      try {
        if (!this.mc.delete(k)) {
          if (!await this.fc.del(k))
            resovle(false)
        }

        resovle(true)
      } catch (err) { reject(err) }
    })
  }
}

module.exports = Cache
