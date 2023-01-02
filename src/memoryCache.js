const constants = require("./constants")
const utils = require("./utils")
const { Record } = require("./record")
const { spectralClustering } = require("./sc")

class MemoryCache {
  constructor(options = {}) {
    const {
      maxSize = constants.SIZE.K128,
      maxSizeSingle = constants.SIZE.K8,
      sizeCalculation
    } = options

    if (!utils.isPosInt(maxSize) || !utils.isPosInt(maxSizeSingle))
      throw new Error("maxSize and maxSizeSingle must be an positive number.")

    if (maxSizeSingle > maxSize)
      throw new Error("maxSizeSingle can't outweigh maxSize")

    if (!sizeCalculation || typeof sizeCalculation !== 'function')
      this.sizeCalculation = (k, v) => utils._size_def_in_memory(k) + utils._size_def_in_memory(v)
    else
      this.sizeCalculation = (k, v) => sizeCalculation(k) + sizeCalculation(v)

    this.keyMap = new Map()
    this.keyList = new Array()
    this.valList = new Array()
    this.next = new Array()
    this.prev = new Array()
    this.head = 0
    this.tail = 0
    // this.periodQueue = new Record(period)
    // this.fileCache = new 

    this.cachedNum = 0                        // 当前已存储个数
    this.cachedSize = 0                       // 当前已存储大小
    this.maxSizeSingle = maxSizeSingle        // 允许的单对象最大大小
    this.maxSize = maxSize

    this.initialFill = 1
    this.free = []
    this.toMove = {}

    this.record = new Record(300, 100, 10)
  }

  isValidIndex(index) {
    return this.keyMap.get(this.keyList[index]) === index
  }

  connect(p, n) {
    this.prev[n] = p
    this.next[p] = n
  }

  newIndex(size) {
    if (!this.cachedNum) return this.tail

    if (size + this.cachedSize > this.maxSize) 
      this.evict(size)  // free size

    if (this.free.length)
      return this.free.pop()

    return this.initialFill++
  }

  evict(size) {
    // 指定大小的存储空间释放
    let freedSize = 0

    while (freedSize < size) {
      const head = this.head
      const k = this.keyList[head]
      const v = this.valList[head]
      if (k === null && v === null) throw new Error("无法释放足够空间")

      const size_ = this.sizeCalculation(k, v)

      this.keyList[head] = null
      this.valList[head] = null
      this.keyMap.delete(k)
      this.free.push(head)
      this.toMove[k] = v

      this.prev[head] = null
      this.head = this.next[head]

      this.cachedNum--
      this.cachedSize -= size_
      freedSize += size_

      if (size + this.cachedSize <= this.maxSize)  break
    }
  }

  set(k, v) {
    k = utils.typeStringNeed(k) ? JSON.stringify(k) : k

    let size = this.sizeCalculation(k, v)
    if (size > this.maxSizeSingle) return this

    let index = this.cachedNum ? this.keyMap.get(k) : undefined

    if (index === undefined) {
      // addition
      index = this.newIndex(size)
      this.keyList[index] = k
      this.valList[index] = v
      this.keyMap.set(k, index)
      this.next[this.tail] = index
      this.prev[index] = this.tail
      this.tail = index

      this.cachedNum++
      this.cachedSize += size
      this.sc(k, 1)
    } else {
      // updating
      this.valList[index] = v

      if (this.sc(k, 0))
        // sc thought its popular
        this.moveToTail(index)
      else
        this.moveToMiddle(index)
    }
  }

  get(k) {
    k = utils.typeStringNeed(k) ? JSON.stringify(k) : k

    const index = this.keyMap.get(k)

    if (index !== undefined){
      if (this.isValidIndex(index)) {
        this.sc(k, 1)
        return this.valList[index]
      }
      else
        this.delete(k)
    }
    
    return undefined
  }

  delete(k) {
    k = utils.typeStringNeed(k) ? JSON.stringify(k) : k

    if (this.cachedSize) {
      const index = this.keyMap.get(k)

      if (index !== undefined) {
        const size_ = this.sizeCalculation(k, this.valList[index])
        this.keyMap.delete(k)
        this.keyList[index] = null
        this.valList[index] = null

        if (index === this.tail) this.tail = this.prev[index]
        else if (index === this.head) this.head = this.next[this.head]
        else {
          this.next[this.prev[index]] = this.next[index]
          this.prev[this.next[index]] = this.prev[index]
        }

        this.cachedNum--
        this.cachedSize -= size_
        this.free.push(index)

        return true
      }
    }

    return false
  }

  moveToTail(index) {
    if (index !== this.tail) {
      if (index === this.head)
        this.head = this.next[index]
      else
        this.connect(this.prev[index], this.next[index])

      this.connect(this.tail, index)
      this.tail = index
    }
  }

  moveToMiddle(index) {
    const midLen = Math.floor(this.cachedNum / 2) // 问题在与总数的一半作为下标根本不能表示队列的一半位置
    let midIndex = this.head
    for (let i = 0; i < midLen; i++)
      midIndex = this.next[midIndex]

    if (index !== midIndex && this.cachedNum > 2) {
      if (index === this.head)
        this.head = this.next[index]
      else if(index === this.tail)
        this.tail = this.prev[index]
      else
        this.connect(this.prev[index], this.next[index])

      const midIndexNext = this.next[midIndex]
      this.connect(midIndex, index)
      this.connect(index, midIndexNext)
    }
  }

  has(k) {
    return this.keyMap.get(k) !== undefined
  }

  sc(k, onlyRecord=0) {
    if (!this.record.push(k) || onlyRecord) 
      return 1

    const scRes = spectralClustering(this.record.frozenSCPart.concat(this.record.activeSCPart), 2)
    const will = scRes[scRes.length - 1]
    return scRes[0] ? !will : will
  }

  // *indices() {
  //   if (this.cachedNum) {
  //     let _i = this.tail

  //     while (true) {
  //       if (!this.isValidIndex(_i)) break
  //       yield _i
  //       if (_i === this.head) break
  //       else  _i = this.prev[_i]
  //     }
  //   }
  // }

  // *rindices() {
  //   if (this.cachedNum) {
  //     let _i = this.head

  //     while (true) {
  //       if (!this.isValidIndex(_i)) break
  //       yield _i
  //       if (_i === this.tail) break
  //       else _i = this.next(_i)
  //     }
  //   }
  // }

  // *entries() {
  //   for (const _i of this.indices()) yield [this.keyList[_i], this.valList[_i].data]
  // }

  // *rentries() {
  //   for (const _i of this.rindices()) yield [this.keyList[_i], this.valList[_i].data]
  // }

  // *keys() {
  //   for (const _i of this.indices()) yield this.keyList[_i]
  // }

  // *rkeys() {
  //   for (const _i of this.rindices()) yield this.keyList[_i]
  // }

  // *values() {
  //   for (const _i of this.indices()) yield this.valList[_i].data
  // }

  // *rvalues() {
  //   for (const _i of this.rindices()) yield this.valList[_i].data
  // }

  // [Symbol.iterator]() {
  //   return this.entries()
  // }
}

module.exports.MemoryCache = MemoryCache
