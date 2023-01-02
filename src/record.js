class Record {
  constructor(max, frozenLen, sw) {
    this.record = {}  // {"key1": {"total_visited_count": 10, "last_visited_time": xxx, history: [time1, ..., timeN]}}
    this.activeSCPart = new Array()
    this.frozenSCPart = new Array()

    this.max = max
    this.frozenLen = frozenLen
    this.activeLen = max - frozenLen

    this.sw = sw
    this.swRange = sw * 1000
  }

  push(k) {
    const nowTime = new Date().getTime()
    
    const obj = []
    if (this.record.hasOwnProperty(k)) {
      obj.push(Math.floor((nowTime - this.record[k]["last_visited_time"]) / 1000))
      obj.push(this.record[k]["total_visited_count"])

      // 清理滑动窗口左边界之前的时间记录
      const leftMargin = nowTime - this.swRange
      while (this.record[k]["history"].length) {
        if (leftMargin > this.record[k]["history"][0])
          this.record[k]["history"].shift()
        else
          break
      }
      
      // 清理后history中都是位于滑动窗口内的
      const len_ = this.record[k]["history"].length
      obj.push(len_ ? Math.floor((nowTime - this.record[k]["history"][len_ - 1]) / 1000) : this.sw)
      obj.push(len_)

      this.record[k]["total_visited_count"] += 1
    }else {
      obj.push(-1, 0, this.sw, 0)
      this.record[k] = {"total_visited_count": 1, "history": []}
    }

    this.record[k]["last_visited_time"] = nowTime
    this.record[k]["history"].push(nowTime)

    // form sc
    if (this.frozenSCPart.length < this.frozenLen)
      this.frozenSCPart.push(obj)
    else {
      while (this.activeSCPart.length >= this.activeLen) this.activeSCPart.shift()
      this.activeSCPart.push(obj)

      if (this.frozenSCPart.length + this.activeSCPart.length === this.max) {
        return 1    // 可以进行聚类
      }
    }

    return 0
  }

  clear() {
    this.record = {}
    this.activeSCPart = new Array()
    this.frozenSCPart = new Array()
  }

  length() {
    return Object.keys(this.record).length
  }
}

module.exports.Record = Record
