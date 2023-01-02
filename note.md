### 组织结构：
```js
// 内存中文件信息结构
filesInfo: [{size: 30, freq: {k1: 2, k2: 10}}, {size: 10, freq: {k10: 1}}, {size: 66, freq: {k100: 5}}]

/*
磁盘中文件缓存对象结构
rawData - 缓存对象数据（可能为片段）
type - 缓存对象格式（用于用户辅助处理）
length - 缓存对象长度（可能为片段）
order - 用于还原缓存对象的拼接顺序
*/
{keyName: {rawData: x1, length: 100, freq: 2, order: 4, desc: xxx}}
```

### 临时规则：
1. 对于存在于多个文件的磁盘缓存对象，对于相同key每个磁盘缓存对象的length相加 == 内容本身长度 + key的长度
2. 如果cacheFiles目录下有文件且某文件里有内容 =》 单个文件设定的大小至少不小于最大的文件的大小，且设定的文件数量不少于原来目录中的个数
3. key只能为字符串, key=1与key='1'当成同一对象、key=true与key='true'当成同一对象

### 存在的问题：
在set(1, 100)时, filesInfo和keyMap是这样的：
```js [
  { size: 0, freq: {} },
  { size: 0, freq: {} },
  { size: 4, freq: { '1': 1 } }
] Map(1) { 1 => [ 2 ] }
```
去掉set(1, 100)，由类自身根据磁盘文件重构的filesInfo和keyMap是这样的：
```js
[
  { size: 0, freq: {} },
  { size: 0, freq: {} },
  { size: 4, freq: { '1': 2 } }
] Map(1) { '1' => [ 2 ] }
```
