// const FileCache = require("./src/fileCache")
// const utils = require("./src/utils")
// const constants = require("./src/constants")
// const fs = require("fs").promises

// let fc = new FileCache({fileMaxSize: constants.SIZE.K64, fileNumber: 5})

// async function save() {
//   const imageData = await fs.readFile("C://Users//86189//Desktop//t01acb9c087a528529b.jpg", "binary")
//   const htmlData = await fs.readFile("C://Users//86189//Desktop//target.html", "binary")
//   await fc.set("image1", imageData, "A picture")
//   await fc.set("html", htmlData, "this is about JS")

//   console.log(fc.filesInfo, fc.keyMap)
// }

// save()

// async function test() {
//   await fc.get("html")
//   console.log(fc.filesInfo, fc.keyMap)
//   await fc.get("html")
//   console.log(fc.filesInfo, fc.keyMap)
// }

// test()

// const { MemoryCache } = require("./src/memoryCache")
// const AsyncLock = require("async-lock")
// const fileLock = new AsyncLock()
// const utils = require("./src/utils")
// const fs = require("fs").promises
// const fsAll = require("fs")

// let mc = new MemoryCache({ maxSize: 10, maxSizeSingle: 10 })

// const func = async () => {
//   await fileLock.acquire("test.txt", async () => {
//     await fs.writeFile("./cacheFiles/test.txt", "10010101")
//     console.log("1")
//   })
// }

// const func2 = async () => {
//   await fileLock.acquire("test.txt", async () => {
//     fs.writeFile("./cacheFiles/test.txt", "outside")
//     console.log("OK")
//   })
// }

// func()
// func2()

// const { FileCache } = require("./src/fileCache")
// const constants = require("./src/constants")
// const fs = require("fs").promises
// let fc = new FileCache({fileMaxSize: constants.SIZE.K16, fileNumber: 4})

// const func = async () => {
//   const imageData = await fs.readFile("C://Users//86189//Desktop//t01acb9c087a528529b.jpg", "binary")
//   await fc.set("image1", imageData, "A picture")
  
//   console.log(fc.filesInfo, fc.keyMap)
// }

// func()

// let filesInfo = [{size: 30, freq: {k1: 2, k2: 10}}, {size: 10, freq: {k10: 1}}, {size: 66, freq: {k100: 5}}]

// const len = filesInfo.length
// // const randIndex = Math.floor(Math.random() * len)
// // const freqObj = filesInfo[randIndex]["freq"]
// const freqObj = filesInfo[0]["freq"]
// const freqEntries = Object.entries(freqObj)

// if (!freqEntries.length)
//   return

// freqEntries.sort((freq1, freq2) => {
//   return freq2[1] - freq1[1]
// })

// console.log(freqEntries)
// // 从磁盘文件中

// return 


// const { Cache } = require("./src/index")
// const constants = require("./src/constants")
// const utils = require("./src/utils")
// const LruCache = require("lru-cache")

// let cache = new Cache(
//   {maxSize: constants.SIZE.K128, sizeLimitM: constants.SIZE.K8, sizeLimitF: constants.SIZE.K8}
// )
// const cache = new LruCache({ maxSize: 11, maxEntrySize: 4, sizeCalculation: (k, v) => utils._size_def_in_memory(k) + utils._size_def_in_memory(v) })


// const cacache = require("cacache")
// const cachePath = './tmp/my-toy-cache'

// const func = async () => {
//   await cacache.put(cachePath, "name", '111')
//   const val = await cacache.get(cachePath, "name")

//   console.log(val.data)
// }

// func()

const constants = require("./src/constants")
const utils = require("./src/utils")
const { FileSystemCache } = require("file-system-cache")

const cache = new FileSystemCache({
  basePath: "./.cache", // Optional. Path where cache files are stored (default).
  ns: "my-namespace"    // Optional. A grouping namespace for items.
})


const func = async () => {
  // await cache.set("foo", "YFD")
  // await cache.set("foo2", "dyf")
  // await cache.set("k3", "77777777777777777777777777")
  console.log(await cache.get("k4"))
  await cache.remove("foo2")
}

func()
