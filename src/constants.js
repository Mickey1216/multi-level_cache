const constants = {
  SIZE: {
    K8: Math.pow(2, 13),
    K16: Math.pow(2, 14),
    K64: Math.pow(2, 16),
    K128: Math.pow(2, 17),
    M2: Math.pow(2, 21),
    M8: Math.pow(2, 23),
    M16: Math.pow(2, 24),
    M128: Math.pow(2, 27)
  },
  MSG: {
    INIT_FILE_SIZE_ERROR: "缓存空间单文件大小设置过小导致无法加载已有的磁盘数据",
    INIT_FILE_NUM_ERROR: "缓存空间文件数量设置过少导致无法加载已有的磁盘数据"
  }
}

module.exports = constants
