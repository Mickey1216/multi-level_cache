const { MemoryCache } = require("./src/memoryCache")
const constants = require("./src/constants")
const fs = require("fs")

const frontPrint = (mc) => {
  let index = mc.head
  for (let i = 0; i < mc.cachedNum; i++) {
    console.log(mc.valList[index])
    index = mc.next[index]
  }
}

const backPrint = (mc) => {
  let index = mc.tail
  for (let i = 0; i < mc.cachedNum; i++) {
    console.log(mc.valList[index])
    index = mc.prev[index]
  }
}

let logFile = fs.readFileSync("./out.txt", "utf8")

const logData = logFile.split('\n')
let logArr = logData.map(log => {
  let tmp = log.substring(0, log.length - 1).split(' ')
  tmp[1] = parseInt(tmp[1])

  return tmp
})

sizeCalculation = (k, v) => {
  return k.length + v
}
let mc = new MemoryCache({ maxSize:constants.SIZE.K128 * 16, maxSizeSingle:Math.floor(constants.SIZE.K128 / 5), sizeCalculation })
logArr = logArr.filter(log => log[1] < mc.maxSizeSingle)

let index = 1
let range_ = 1500

let sizeTotal = 0
let numTotal = 0
let hitSize = 0
let hitNum = 0

const func = async () => {
  for (let log of logArr) {
    const k = log[0]
    const v = log[1]
  
    sizeTotal += v
    numTotal++
  
    if (mc.get(k)) {
      hitSize += v
      hitNum++
    }
  
    if (!(index % 20)) {
      // const res = `${index} ${(hitSize / sizeTotal * 100).toFixed(2)} ${(hitNum / numTotal * 100).toFixed(2)}\n`
      // await fs.promises.writeFile("./outData1.txt", res, {flag: 'a', encoding: "utf8"})
      console.log(`${index} - BHR: ${(hitSize / sizeTotal * 100).toFixed(2)}%`, `HR: ${(hitNum / numTotal * 100).toFixed(2)}%`)
    }
  
    mc.set(k, v)
  
    if (index++ === range_) break
  }
}

func()

// mc.set(1, 10)
// console.log(mc)
// mc.set(2, 200)
// console.log(mc)
// mc.set("name", "yfd")
// console.log(mc)
// mc.set("age", 180)
// console.log(mc)

// mc.set("newest", -1)
// console.log(mc)

// mc.set("h", 12)
// console.log(mc)

// frontPrint(mc)
// backPrint(mc)
