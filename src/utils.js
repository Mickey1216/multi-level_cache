const fs = require("fs").promises
const fsAll = require("fs")
const path = require("path")

const STORAGE_PATH = "./cacheFiles"
const FILE_PREFIX = "file"
const READ_TRIES = 30

const self = {
  inFileWithoutExisted(fileId, data) {
    !fsAll.existsSync(STORAGE_PATH) && fsAll.mkdirSync(STORAGE_PATH)
    const filePath = this.getFilePathById(fileId)
    !fsAll.existsSync(filePath) && fsAll.writeFileSync(filePath, JSON.stringify(data), "binary")
  },

  readFileSync(fileName, fullyParse=0) {
    let obj = JSON.parse(fsAll.readFileSync(this.getFilePathByName(fileName), "binary"))
    return fullyParse ? this._parseFurther(obj) : obj
  },

  async inFile(fileName, data) {
    try {
      await fs.access(STORAGE_PATH, fsAll.constants.R_OK && fsAll.constants.W_OK)
    } catch {
      await fs.mkdir(STORAGE_PATH)
    }

    await fs.writeFile(path.join(STORAGE_PATH, fileName), JSON.stringify(data), "binary")
  },

  sleep(ms) {
    return new Promise(resolve=>setTimeout(resolve, ms))
  },

  async readFile(fileName, fullyParse=0) {
    let tries = 0

    while (tries++ < READ_TRIES) {
      let data = await fs.readFile(this.getFilePathByName(fileName), {encoding: "binary"})

      if (data !== '' && data !== undefined) {
        let obj = JSON.parse(data)

        return fullyParse ? this._parseFurther(obj) : obj
      }
      await this.sleep(10)
    }

    return null
  },

  getFileName(fileId) {
    return `${FILE_PREFIX}${fileId}`
  },

  getFilePathById(fileId) {
    return path.join(STORAGE_PATH, this.getFileName(fileId))
  },

  getFilePathByName(fileName) {
    return path.join(STORAGE_PATH, fileName)
  },

  getRandIndexArray(len) {
    let randIndexSet = new Array(len)
    for(let i = 0; i < len; i++){
      randIndexSet[i] = i
    }

    return randIndexSet.sort(() => .5 - Math.random())
  },

  getCacheFilesNum() {
    if (!fsAll.existsSync(STORAGE_PATH))
      return 0

    return fsAll.readdirSync(STORAGE_PATH).filter(dir => dir.startsWith(FILE_PREFIX)).length
  },

  purgeFiles(startId, endId) {
    for(let i = startId; i < endId; i++)
      fsAll.unlinkSync(this.getFilePathById(i))
  },

  typeStringNeed(elem) {
    // 是否需要stringify

    if (typeof elem === "string") return 0
    else if (
      typeof elem === "number" || typeof elem === "boolean" ||
      Object.prototype.toString.call(elem) === "[object Object]" ||
      Array.isArray(elem)
    )  return 1
    else return -1
  },

  _parseFurther(parsedObj) {
    // 完全解构
    let entries = Object.entries(parsedObj)
    for (let entry of entries) {
      if (entry[1]["vf"]) {
        parsedObj[entry[0]]["rawData"] = JSON.parse(entry[1]["rawData"])
      }
    }

    return parsedObj
  },

  _size_def_in_file(elem) {
    if (typeof elem === "number") return elem.toString().length
    else if (typeof elem === "string") return elem.length
  
    else
      return 0
  },

  _size_def_in_memory(elem) {
    if (typeof elem === "number") return elem.toString().length
    else if (typeof elem === "string") return elem.length
    else if (typeof elem === "boolean") return 1
  
    else if (Object.prototype.toString.call(elem) === "[object Object]")
      return self._size_def_in_memory(Object.keys(elem)) + self._size_def_in_memory(Object.values(elem))
  
    else if (Array.isArray(elem))
      return elem.reduce((pre, item) => pre + self._size_def_in_memory(item), 0)
  
    else if (elem instanceof Map)
      return self._size_def_in_memory(Array.from(elem.keys())) + self._size_def_in_memory(Array.from(elem.values()))
    
    else if (elem instanceof Set)
      return self._size_def_in_memory(Array.from(elem))
  
    else
      return 0
  },

  isPosInt(n) {
    return n && n === Math.floor(n) && n > 0 && isFinite(n)
  }
}

module.exports = self
