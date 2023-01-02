const utils = require("./utils")
const constants = require("./constants")
const AsyncLock = require("async-lock")
const fileLock = new AsyncLock()

class FileCache{
  constructor(options = {}) {
    const {
      fileMaxSize = constants.SIZE.M8,
      fileNumber = 3,
      cachedThreshold,
      sizeCalculation,
      moveToMcInterval
    } = options

    this.fileMaxSize = fileMaxSize      // 单个文件大小上限
    this.fileNumber = fileNumber        // 文件个数上限
    this.cachedThreshold = cachedThreshold
    this.filesSizeTotal = 0
    this.filesMaxSizeTotal = fileMaxSize * fileNumber

    this.moveToMcInterval = moveToMcInterval
    this.moveToMcCooldown = moveToMcInterval

    if (!sizeCalculation)
      this.sizeCalculation = (k, v) => utils._size_def_in_file(k) + utils._size_def_in_file(v)
    else
      this.sizeCalculation = (k, v) => sizeCalculation(k) + sizeCalculation(v)

    this.keyMap = new Map()
    this.filesInfo = new Array()  
    this.init()
  }

  init() {
    const fileNumber = utils.getCacheFilesNum()
    if (fileNumber > this.fileNumber)
      throw new Error(`${constants.MSG.INIT_FILE_NUM_ERROR}, 参考值>=${fileNumber}`)

    for (let i = 0; i < this.fileNumber; i++) {
      utils.inFileWithoutExisted(i, {})  // 磁盘文件若存在，不会有任何改变

      const data = utils.readFileSync(utils.getFileName(i))
      const keys = Object.keys(data)
      const vals = Object.values(data)

      if (!keys.length)
        this.filesInfo.push({size: 0, freq: {}})
      else {
        // 统计keyMap和文件分布信息
        let size = 0
        let freq = {}

        for (let j in keys) {
          size += vals[j]["length"]
          freq[keys[j]] = vals[j]["freq"]

          let indexSet = this.keyMap.get(keys[j])

          if (indexSet === undefined)
            this.keyMap.set(keys[j], [i])
          else {
            indexSet.push(i)
            this.keyMap.set(keys[j], indexSet)
          }
        }
        this.filesInfo.push({size, freq})
      }
    }

    let existedFileMaxSize = this.filesInfo[0]["size"]
    this.filesInfo.forEach(fileInfo => { 
      if (fileInfo["size"] > existedFileMaxSize) existedFileMaxSize = fileInfo["size"]
    })

    if (existedFileMaxSize > this.fileMaxSize) {
      // 删除新建磁盘文件
      utils.purgeFiles(fileNumber, this.fileNumber)
      throw new Error(`${constants.MSG.INIT_FILE_SIZE_ERROR}，参考值>=${ existedFileMaxSize }`)
    }
  }

  get(k, peek=0) {
    return new Promise(async (resolve, reject) => {
      k = utils.typeStringNeed(k) ? JSON.stringify(k) : k
      const indexSet = this.keyMap.get(k)

      try {
        if (indexSet === undefined)
          return resolve(undefined)

        let retData = ''
        let dataSet = new Array(indexSet.length)
        let vf = 0

        for (let index of indexSet) {
          const fileName = utils.getFileName(index)

          let data = await utils.readFile(fileName)
          if (data[k] === undefined) {
            // 无效数据
            await this._delete(indexSet, k)
            
            return resolve(undefined)
          }

          if (!peek) {
            this.filesInfo[index]["freq"][k] += 1
            data[k]["freq"] += 1
            this.moveToMcCooldown--
            await fileLock.acquire(fileName, async () => {
              await utils.inFile(fileName, data)
            })
          }

          dataSet[data[k]["order"] - 1] = data[k]["rawData"]
          vf = data[k]["vf"]
        }

        dataSet.forEach(rawData => {
          retData += rawData
        })
        
        resolve(vf ? JSON.parse(retData) : retData)

      } catch(err) { reject(err) }
    })
  }

  set(k, v, desc='') {
    return new Promise(async (resolve, reject) => {
      try{
        k = utils.typeStringNeed(k) ? JSON.stringify(k) : k
        const indexSet = this.keyMap.get(k)
        
        if (indexSet !== undefined){
          if (await this.get(k, true) === v)
            return resolve(true)   // nothing changed 
          else
            await this._delete(indexSet, k)  // delete cached stuffs before updating
        }

        // new
        resolve(await this._add(k, v, desc))
      } catch(err) { reject(err) }
    })
  }

  del(k) {
    return new Promise(async (resolve, reject) => {
      k = utils.typeStringNeed(k) ? JSON.stringify(k) : k
      const indexSet = this.keyMap.get(k)

      try{
        if (indexSet === undefined) return resolve(false)

        await this._delete(indexSet, k)
        resolve(true)
      } catch(err) { reject(err) }
    })
  }

  upper() {
    // 磁盘最高频对象跃升
    return new Promise(async (resolve, reject) => { 
      if (this.moveToMcCooldown !== 0)
        resolve(undefined) 
      
      try {
        const randIndex = Math.floor(Math.random() * this.filesInfo.length)
        const freqObj = this.filesInfo[randIndex]["freq"]
        const freqEntries = Object.entries(freqObj)
  
        if (!freqEntries.length)
          resolve(undefined)
  
        freqEntries.sort((freq1, freq2) => {
          return freq2[1] - freq1[1]
        })
        
        const kv = freqEntries[0]
        // 从磁盘缓存中删除该对象
        if (this.keyMap.has(kv[0]))
          await this._delete(this.keyMap.get(kv[0]), kv[0])
  
        resolve(kv)
      } catch(err) { reject(err) }
    })
  }

  findIndexSetCaching(size) {
    const len = this.filesInfo.length
    let lookIndexSet = utils.getRandIndexArray(len)
    let unallocatedSize = size
    let allocatedList = new Array(len).fill(0)

    for (let fileId of lookIndexSet) {
      const remainingSize = this.fileMaxSize - this.filesInfo[fileId]["size"]

      allocatedList[fileId] += remainingSize >= unallocatedSize ? unallocatedSize : remainingSize
      unallocatedSize -= allocatedList[fileId]

      if (unallocatedSize <= 0)
        break
    }

    return allocatedList
  }
  
  async _add(k, v, desc) {
    const keyFlag = utils.typeStringNeed(k)
    const valFlag = utils.typeStringNeed(v)

    if (keyFlag === -1 || valFlag === -1)
      return false
    
    k = keyFlag ? JSON.stringify(k) : k
    v = valFlag ? JSON.stringify(v) : v

    const size = this.sizeCalculation(k, v)
    if (!size || size > this.filesMaxSizeTotal || size > this.cachedThreshold)
      return false

    // 二级缓存剩余空间不足，LFU invoked
    if (this.filesMaxSizeTotal && this.filesSizeTotal + size > this.filesMaxSizeTotal){
      const len = this.filesInfo.length
      const deletedIndexSet = utils.getRandIndexArray(len)
      let deletedSize = 0
      let index = 0

      // 随机下标文件删除频率最低的，直到腾出足够空间
      while (deletedSize < size) {
        const fileId = deletedIndexSet[index]
        const fileFreqObj = this.filesInfo[fileId]["freq"]
        
        const kvs = Object.entries(fileFreqObj)
        let [minKey, minFreq] = kvs[0]

        for (let kv of kvs) {
          if (minFreq === 1) break

          [minKey, minFreq] = minFreq > kv[1] ? kv : [minKey, minFreq]
        }

        deletedSize += await this._delete(this.keyMap.get(minKey), minKey)

        index++
        if (index === len) index = 0
      }
    }

    // 确定在哪个文件或者哪些文件添加
    const allocatedList = this.findIndexSetCaching(size)
    let order = 1

    for (let index in allocatedList) {
      const fileName = utils.getFileName(index)
      const cacheSize = allocatedList[index]

      if (cacheSize) {
        let data = await utils.readFile(fileName)

        data[k] = {rawData: v.substr(0, cacheSize), length: cacheSize, freq: 1, order, vf: valFlag, desc}
        v = v.substring(cacheSize)
        order++

        // 更新缓存文件
        await fileLock.acquire(fileName, async () => {
          await utils.inFile(fileName, data)
        })

        // 更新信息
        this.filesInfo[index]["size"] += cacheSize
        this.filesInfo[index]["freq"][k] = 1
        this.filesSizeTotal += cacheSize
      }
    }

    let indexSet = new Array()
    let index_ = 0
    allocatedList.forEach((item, index) => {
      if (item)
        indexSet[index_++] = index
    })
    this.keyMap.set(k, indexSet)

    return true
  }
  
  async _delete(indexSet, k) {
    // 删除key在所有文件中的数据
    let deletedLenCount = 0
  
    for (let fileId of indexSet) {
      const fileName = utils.getFileName(fileId)
      let data = await utils.readFile(fileName)

      if (data[k] === undefined) {
        // 重新统计调整大小
        // let filesInfoCount = 0

        // for (let k = 0; k < this.filesInfo.length; k++) {
        //   filesInfoCount += Object.keys(this.filesInfo[k]["freq"]).length
        // }

        // console.log(filesInfoCount)

        // --- 
        let sizeAdjust = 0
        let freqsAdjust = {}
        const keys = Object.keys(data)
        
        keys.forEach(key => {
          sizeAdjust += data[key]["length"]
          freqsAdjust[key] = data[key]["freq"]
        })

        this.filesSizeTotal += sizeAdjust - this.filesInfo[fileId]["size"]

        this.filesInfo[fileId]["size"] = sizeAdjust
        this.filesInfo[fileId]["freq"] = freqsAdjust

        continue
      }
      const deletedLen = data[k]["length"]

      typeof data === "object" && delete data[k]      // 删除单个文件key
      
      await fileLock.acquire(fileName, async () => {  // 更新此磁盘文件
        await utils.inFile(fileName, data)
      })

      // filesInfo中size减小、freq取出 以及 全局size减小
      this.filesInfo[fileId]["size"] -= deletedLen
      delete this.filesInfo[fileId]["freq"][k]
      this.filesSizeTotal -= deletedLen

      deletedLenCount += deletedLen
    }

    // keyMap
    this.keyMap.delete(k)

    return deletedLenCount
  }
}

module.exports.FileCache = FileCache
