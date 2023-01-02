// *********************************************************************
// ************性能测试**************************************************
// *********************************************************************
const fs = require("fs")
const constants = require("../src/constants")
const utils = require("../src/utils")

const Cache = require("../src/index")
const Cache_ = require("cache")
const LruCache = require("lru-cache")
const { FileSystemCache } = require("file-system-cache")

let logFile = fs.readFileSync("./out.txt", "utf8")

const logData = logFile.split('\n')
let logArr = logData.map(log => {
  let tmp = log.substring(0, log.length - 1).split(' ')
  tmp[1] = parseInt(tmp[1])

  return tmp
})
const MAXSIZE = constants.SIZE.K128 * 8
const SIZELIMIT = constants.SIZE.K128

logArr = logArr.filter(log => log[1] < SIZELIMIT)
// const len_ = logArr.length
// const obj_ = {}
// const tmpArr = []
// let sizec_ = 0

// for (let i = 0; i < len_; i++) {
//   if (!obj_.hasOwnProperty(logArr[i][0]) && logArr[i][1] <= constants.SIZE.K8) {
//     tmpArr.push(logArr[i])
//     obj_[logArr[i][0]] = 1
//     sizec_ += logArr[i][1]
//   }

//   if (tmpArr.length >= 2000)
//     break
// }
// logArr = tmpArr

let copyBase = ''
for(let i = 0; i < SIZELIMIT; i++)
  copyBase += '7'

// const cache = new Cache(
//   {maxSize: constants.SIZE.M8, dists: [.2, .8], sizeLimitM: SIZELIMIT, sizeLimitF: SIZELIMIT}
// )

// const fsCache = new FileSystemCache({
//   basePath: "./fsCache", // Optional. Path where cache files are stored (default).
//   ns: "my-namespace"    // Optional. A grouping namespace for items.
// })


// Test1
// const asyncTest1 = async (stopTestIndex, infoDisplayInterval) => {
//   let index = 0
//   let tc1 = 0
//   let tc2 = 0
  
//   while (index <= 1) {
//     for (let i = 0; i < stopTestIndex; i++) {
//       const key = logArr[i][0]
//       const val = copyBase.substring(0, logArr[i][1])
//       const len = val.length
      
//       if (!index) {
//         // 添加数据
//         await cache.set(key, val)
//         await fsCache.set(key, val)
//         console.log(i)
//       } else {
//         const t11 = new Date().getTime()
//         const _1 = await cache.get(key)
//         const t12 = new Date().getTime()

//         const t21 = new Date().getTime()
//         const _2 = await cache.get(key)
//         const t22 = new Date().getTime()

//         tc1 += t12 - t11
//         tc2 += t22 - t21
//         console.log(i)
//       }
//     }
//     index++
//   }
//   console.log(tc1, tc2)
// }

// asyncTest1(2000, 100)

// Test2
const cache = new Cache(
  {maxSize: MAXSIZE, sizeLimitM: SIZELIMIT, sizeLimitF: SIZELIMIT}
)
const cache_ = new Cache_(maxSize = MAXSIZE, maxEntrySize = SIZELIMIT, sizeCalc = utils._size_def_in_memory)  // 已魔改
const lruCache = new LruCache({ maxSize: MAXSIZE, maxEntrySize: SIZELIMIT, sizeCalculation: (k, v) => utils._size_def_in_memory(k) + utils._size_def_in_memory(v) })
let sizeArr = []
let hitArr = []
let pointArr = []
let hr = []
let bhr = []
const asyncTest2 = async (stopTestIndex, infoDisplayInterval) => {
  let arr = new Array(6).fill(0)  // format: [sh1, sh2, sh3, nh1, nh2, nh3]
  let sizeTotal = 0
  let numberTotal = 0

  for (let i = 0; i < stopTestIndex; i++) {
    const key = logArr[i][0]
    const val = copyBase.substring(0, logArr[i][1])
    const len = val.length

    const _1 = await cache.get(key)
    const _2 = cache_.get(key)
    const _3 = lruCache.get(key)

    if (_1 !== undefined) {
      arr[0] += len
      arr[3] += 1
    }
    if (_2 !== null) {
      arr[1] += len
      arr[4] += 1
    }
    if (_3 !== undefined) {
      arr[2] += len
      arr[5] += 1
    }

    sizeTotal += len
    numberTotal++

    await cache.set(key, val)
    cache_.put(key, val)
    lruCache.set(key, val)

    if (!(i % infoDisplayInterval)) {
      sizeArr.push([arr[0], arr[1], arr[2]])
      hitArr.push([arr[3], arr[4], arr[5]])
      pointArr.push([sizeTotal, numberTotal])
      bhr.push([arr[0]/sizeTotal, arr[1]/sizeTotal, arr[2]/sizeTotal])
      hr.push([arr[3]/numberTotal, arr[4]/numberTotal, arr[5]/numberTotal])
    }
  }

  console.log(sizeArr, hitArr, pointArr, bhr, hr)
}


asyncTest2(2000, 100)

// // test data source preparation ok ---

// const STOP_TEST_INDEX = 2000
// const INFO_DISPLAY_INTERVAL = 20

// let testSizeTotal = 0
// let testSizeHit = 0
// let testNumberTotal = 0
// let testNumberHit = 0

// const sleep = (timeountMS) => new Promise((resolve) => {
//   setTimeout(resolve, timeountMS);
// })

// const AysncTestFunc = async () => {
//   for (let i = 0; i < STOP_TEST_INDEX; i++){
//     const key = logArr[i][0]
//     const val = copyBase.substring(0, logArr[i][1])
//     const len = val.length

//     if (await cache.get(key) !== undefined) {
//       // hit
//       testSizeHit += len
//       testNumberHit++
//     }

//     testSizeTotal += len
//     testNumberTotal++

//     if (!(i % INFO_DISPLAY_INTERVAL)) {
//       const bhr = (testSizeHit / testSizeTotal * 100).toFixed(2)
//       const hr = (testNumberHit / testNumberTotal * 100).toFixed(2)

//       console.log(`${i} - BHR: ${ bhr }%`, `HR: ${ hr }%`)
//     }
    
//     await cache.set(key, val)
//   }
// }

// AysncTestFunc()


// logArr = logArr.filter(log => log[1] < fc.cachedThreshold)

// let cache = new Cache(
//   {maxSize: constants.SIZE.K128, sizeLimitM: constants.SIZE.K8, sizeLimitF: constants.SIZE.K8}
// )

// const func = async () => {
//   await cache.fc.set("k11", {name: "ll", age: 16})
//   await cache.fc.set("k12", '{name: "ll", age: 16}')

//   const data1 = await cache.get("k11")
//   const data2 = await cache.get("k12")
//   console.log(data1, typeof data1)
//   console.log(data2, typeof data2)
// }

// func()
// console.log(JSON.parse("{name: \"ll\", age: 16}"))
// console.log(JSON.parse("{\"name\":\"ll\",\"age\":16}"))



// *********************************************************************
// ************功能测试**************************************************
// *********************************************************************
// const Cache = require("../src/index")
// const constants = require("../src/constants")

// var chai = require('chai')
// var expect = chai.expect

// describe('Cache', function() {
//   let cache = new Cache(
//     {maxSize: constants.SIZE.K128, sizeLimitM: constants.SIZE.K8, sizeLimitF: constants.SIZE.K8}
//   )

//   describe('#test async get()', function() {
//     it('should return cached resource - key exists', async function() {
//       const val = {name: "ll", age: 16}

//       await cache.set("k1", val)
//       await cache.set("k2", val.toString())
//       expect(await cache.get("k1")).to.deep.equal(val)
//     });

//     it('should return undefined - key does not exist', async function() {
//       expect(await cache.get("name2")).to.equal(undefined)
//     });
//   });

//   describe('#test async set()', function() {
//     it('added cached object', async function() {
//       const prevNum = cache.mc.keyList.length

//       await cache.set("name1", "ll")
//       expect(await cache.get("name1")).to.equal("ll")
//     });

//     it('updated cached object', async function() {
//       const prevNum = cache.mc.keyList.length

//       await cache.set("name1", "liulu")
//       expect(await cache.get("name1")).to.equal("liulu")
//       expect(cache.mc.keyList.length).to.equal(prevNum)
//     });
//   });

//   describe('#test async delete()', function() {
//     it('deleted cached object', async function() {
//       await cache.delete("k1")
//       expect(await cache.get("k1")).to.equal(undefined)
//     })
//   });
// });

// describe('MemoryCache', function() {
//   let cache = new Cache(
//     {maxSize: constants.SIZE.K128, sizeLimitM: constants.SIZE.K8, sizeLimitF: constants.SIZE.K8}
//   )

//   describe('#test get()', function() {
//     it('should return cached resource - key exists', function() {
//       const val = {name: "ll", age: 16}

//       cache.mc.set("k1", val)
//       cache.mc.set("k2", val.toString())
//       expect(cache.mc.get("k1")).to.deep.equal(val)
//     });

//     it('should return undefined - key does not exist', function() {
//       expect(cache.mc.get("name2")).to.equal(undefined)
//     });
//   });

//   describe('#test set()', function() {
//     it('added cached object', async function() {
//       const prevNum = cache.mc.keyList.length

//       cache.mc.set("name1", "ll")
//       expect(cache.mc.get("name1")).to.equal("ll")
//       expect(cache.mc.keyList.length).to.equal(prevNum + 1)
//     });

//     it('updated cached object', function() {
//       const prevNum = cache.mc.keyList.length

//       cache.mc.set("name1", "liulu")
//       expect(cache.mc.get("name1")).to.equal("liulu")
//       expect(cache.mc.keyList.length).to.equal(prevNum)
//     });
//   });

//   describe('#test delete()', function() {
//     it('deleted cached object', function() {
//       cache.mc.delete("k1")
//       expect(cache.mc.get("k1")).to.equal(undefined)
//     })
//   });
// });

// describe('FileCache', function() {
//   let cache = new Cache(
//     {maxSize: constants.SIZE.K128, sizeLimitM: constants.SIZE.K8, sizeLimitF: constants.SIZE.K8}
//   )

//   describe('#test async get()', function() {
//     it('should return cached resource - key exists', async function() {
//       const val = {name: "ll", age: 16}

//       await cache.fc.set("k1", val)
//       await cache.fc.set("k2", val.toString())
//       expect(await cache.fc.get("k1")).to.deep.equal(val)
//     });

//     it('should return undefined - key does not exist', async function() {
//       expect(await cache.fc.get("name2")).to.equal(undefined)
//     });
//   });

//   describe('#test async set()', function() {
//     it('added cached object', async function() {
//       const prevNum = Object.keys(cache.fc.keyMap).length

//       await cache.fc.set("name1", "ll")
//       expect(await cache.fc.get("name1")).to.equal("ll")
//     });

//     it('updated cached object', async function() {
//       const prevNum = Object.keys(cache.fc.keyMap).length

//       await cache.fc.set("name1", "liulu")
//       expect(await cache.fc.get("name1")).to.equal("liulu")
//       expect(Object.keys(cache.fc.keyMap).length).to.equal(prevNum)
//     });
//   });

//   describe('#test async del()', function() {
//     it('deleted cached object', async function() {
//       await cache.fc.del("k1")
//       expect(await cache.fc.get("k1")).to.equal(undefined)
//     })
//   });
// });
