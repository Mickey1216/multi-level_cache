const { Matrix, EigenvalueDecomposition } = require('ml-matrix')
const distanceMatrix = require('ml-distance-matrix')
const { euclidean } = require('ml-distance-euclidean')
const kmeans = require('ml-kmeans')

// pairwise distance using rbf kernal
function _rbf_kernal(X, gamma) {
  X = new Matrix(X)
  let K = new Matrix(distanceMatrix(X.to2DArray(), euclidean))

  return Matrix.exp(K.mul(-gamma || -(1.0 / X.columns)))
}

function _laplacian(graph) {
  const _rows = graph.rows

  // degree matrix
  let D = Matrix.zeros(_rows, _rows)

  for (let i = 0; i < _rows; i++) {
    let _row_acc = 0

    graph.data[i].forEach(elem => {
      _row_acc += elem
    })
    
    D.set(i, i, _row_acc)
  }

  return D.sub(graph)
}

function spectralClustering(X, n_clusters) {
  let affinity = _rbf_kernal(X)
  let L = _laplacian(affinity)
  
  let e = new EigenvalueDecomposition(L)
  let eigenVal_real = e.realEigenvalues
  let eigenVectors = e.eigenvectorMatrix
  
  let _indices = [...eigenVal_real.keys()].sort((a, b) => eigenVal_real[a] - eigenVal_real[b])
  let maps = null

  // take out the eigenvectors corresponding to the first n_clusters smallest eigenvalues
  if ([...eigenVal_real.keys()].toString() === _indices.toString())
    maps = eigenVectors.subMatrixColumn(_indices)

  maps = eigenVectors.subMatrix(0, eigenVectors.rows - 1, 0, n_clusters - 1)

  return kmeans(maps.to2DArray(), n_clusters).clusters
}

module.exports.spectralClustering = spectralClustering
