const fs = require("fs")
const { FileCache } = require("./src/fileCache")
const constants = require("./src/constants")

let logFile = fs.readFileSync("./out.txt", "utf8")

const logData = logFile.split('\n')
let logArr = logData.map(log => {
  let tmp = log.substring(0, log.length - 1).split(' ')
  tmp[1] = parseInt(tmp[1])

  return tmp
})

let fc = new FileCache({ fileMaxSize: constants.SIZE.K128, fileNumber: 16 })

let copyBase = ''
for(let i = 0; i < fc.cachedThreshold; i++)
  copyBase += '7'

logArr = logArr.filter(log => log[1] < fc.cachedThreshold)

let index = 1
let range_ = 1500

let sizeTotal = 0
let numTotal = 0
let hitSize = 0
let hitNum = 0
let record = {}
func = async () => {
  for (let log of logArr) {
    const k = log[0]
    const v = copyBase.substring(0, log[1])
    
    sizeTotal += log[1]
    numTotal++
    if (fc.keyMap.get(k)) {
      hitSize += log[1]
      hitNum++
    }
    
    if (!(index % 20)) {
      const res = `${index} ${(hitSize / sizeTotal * 100).toFixed(2)} ${(hitNum / numTotal * 100).toFixed(2)}\n`
      await fs.promises.writeFile("./outData1.txt", res, {flag: 'a', encoding: "utf8"})
      console.log(`${index} - BHR: ${(hitSize / sizeTotal * 100).toFixed(2)}%`, `HR: ${(hitNum / numTotal * 100).toFixed(2)}%`)
    }

    await fc.set(k, v)
  
    if (index++ === range_) break
  }

  console.log(fc.filesInfo)
}

func()
