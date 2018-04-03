import { WebGLRenderer, Scene, PerspectiveCamera, PointLight, MeshBasicMaterial, MeshPhongMaterial, Mesh, BoxHelper } from 'three'
import OBJLoader from 'three-obj-loader'
import OBJExporter from 'three-obj-exporter'
import loop from 'raf-loop'
import WAGNER from '@superguigui/wagner'
import BloomPass from '@superguigui/wagner/src/passes/bloom/MultiPassBloomPass'
import FXAAPass from '@superguigui/wagner/src/passes/fxaa/FXAAPass'
import resize from 'brindille-resize'
import Torus from './objects/Torus'
import OrbitControls from './controls/OrbitControls'
import dat from 'dat.gui';
import _ from 'lodash'
import save from 'save-file'
import * as THREE from 'three'
import DecibelMeter from 'decibel-meter'
import p5 from "p5"
import "p5/lib/addons/p5.sound"


const mic = new p5.AudioIn()
mic.start()

// injecting ref to three
// it should have it's own, like the FBXLoader had
OBJLoader(THREE)

const gui = new dat.GUI();

/* Custom settings */
const SETTINGS = {
  useComposer: false,
  frozen: false,
  wiggleFactor: 0.01,
  useMic: true,
  micSensitivity: 5
}

/* Init renderer and canvas */
const container = document.body
const renderer = new WebGLRenderer({antialias: true})
// renderer.setClearColor(0x323232)
renderer.setClearColor('white')
container.style.overflow = 'hidden'
container.style.margin = 0
container.appendChild(renderer.domElement)

/* Composer for special effects */
const composer = new WAGNER.Composer(renderer)
const bloomPass = new BloomPass()
const fxaaPass = new FXAAPass()

/* Main scene and camera */
const scene = new Scene()
// scene.position.set(0, -2, 0)
const camera = new PerspectiveCamera(50, resize.width / resize.height, 0.1, 1000)
camera.position.set(0,2,10)
// const controls = new OrbitControls(camera, {element: renderer.domElement, parent: renderer.domElement, distance: 10, phi: Math.PI * 0.5})



/* Lights */
const frontLight = new PointLight(0xFFFFFF, 1)
const backLight = new PointLight(0xFFFFFF, 1)
scene.add(frontLight)
scene.add(backLight)
frontLight.position.z = 40
backLight.position.z = -40

/* Actual content of the scene */
const torus = new Torus()
// scene.add(torus)

let base

let segments = []


const loader = new THREE.OBJLoader()
console.log('asdasd: ', loader)
loader.load('models/plant1-1-dec-7kfaces.obj', function(obj) {
// loader.load('models/plant1-1.obj', function(obj) {
  // addMeshes(obj)
  // buildTree(obj)
  base = obj
  // obj.position.set(0, -2, 0)
  scene.add(obj)
  const objToClone = obj.clone()
  const sc = 0.08
  obj.scale.set(sc,sc,sc)
  obj.scale.set(sc,sc,sc)
  obj.rotateX(-90)
  // segments.push(obj)
  const b1 = addBranchToSelf(obj, objToClone)
  addBranchToSelf(b1, objToClone)
  addBranchToSelf(addBranchToSelf(b1, objToClone),objToClone)
  addBranchToSelf(obj, objToClone)

})




function addBranchToSelf(branch, objToClone) {
  const newBranch = objToClone.clone()
  // const end = branch.children[1]
  // end.geometry.computeBoundingBox()
  const center = {x:2.2268511038273573,y:-0.2776235342025757,z:20.93535041809082}
  // const center = end.geometry.boundingBox.getCenter()
  console.log('center: ', center)
  branch.add(newBranch) 
  newBranch.position.set(center.x, center.y, center.z) // can I set directly with a vector3?
  
  branch.add(newBranch)
  newBranch.rotateX(_.random(0.1,1))
  newBranch.rotateY(_.random(0.1,1))
  newBranch.rotateZ(_.random(0.1,10))
  newBranch.scale.set(1,1,1)
  segments.push(newBranch)
  return newBranch
}




// function addMeshes(object) {
//   const geo = object.children[0].geometry
//   segments = _.times(6, ()=> {
//     const mat = new MeshPhongMaterial({color: 0xffffff, lights: true})
//     // const mesh = new Mesh(geo, torus.children[0].material)
//     // const mat = new MeshBasicMaterial({color: 'white'})
//     const mesh = new Mesh(geo, mat)
//     const scale = _.random(0.0, 0.2)
//     mesh.rotation.set(_.random(1, 5), _.random(1, 5), _.random(1, 5))
//     mesh.scale.set(scale, scale, scale)
//     scene.add( mesh )
//     return mesh
//   })
// }

// function buildTree(object) {
//   console.log('obj: ', object)
// }

/* Various event listeners */
resize.addListener(onResize)

/* create and launch main loop */
const engine = loop(render)
engine.start()

/* some stuff with gui */
gui.add(SETTINGS, 'useComposer')
gui.add(SETTINGS, 'useMic').listen()
gui.add(SETTINGS, 'micSensitivity', 0, 10).listen()
gui.add(SETTINGS, 'frozen').listen()
gui.add(SETTINGS, 'wiggleFactor', 0, 0.2).listen()

// const obj = { add:function(){ console.log("clicked") }};
gui.add({exportOBJ:exportOBJ},'exportOBJ');

function toggleFreeze() {
  SETTINGS.frozen = !SETTINGS.frozen
}

window.addEventListener('keydown', e => {
  console.log('key: ', e)
  if (e.code === 'Space') {
    toggleFreeze()
  } else if (e.code ==='Enter') {
    exportOBJ()
  }
})

function exportOBJ () {
  const exporter = new OBJExporter()
  const data = exporter.parse(scene)
  console.log('data: ', data)
  save(data, 'lala.obj', (err, data) => {
      if (err) throw err;
      //file is saved at this point, data is arrayBuffer with actual saved data 
  })
  
}

/* -------------------------------------------------------------------------------- */

/**
  Resize canvas
*/
function onResize () {
  camera.aspect = resize.width / resize.height
  camera.updateProjectionMatrix()
  renderer.setSize(resize.width, resize.height)
  composer.setSize(resize.width, resize.height)
}

/**
  Render loop
*/
function render (dt) {

  camera.rotation.z = 0

  if (!SETTINGS.frozen) {
    _.each(segments, (seg) => {
      // const wiggleFactor = 0.01
      // console.log('mic: ', mic.getLevel())
      
      if (SETTINGS.useMic) {
        SETTINGS.wiggleFactor = mic.getLevel() * SETTINGS.micSensitivity
      }

      seg.rotateX(_.random(-SETTINGS.wiggleFactor,SETTINGS.wiggleFactor))
      seg.rotateY(_.random(-SETTINGS.wiggleFactor,SETTINGS.wiggleFactor))
      seg.rotateZ(_.random(-SETTINGS.wiggleFactor,SETTINGS.wiggleFactor))
      
      const xyRotationClamp = 2

      // console.log('rotation: ', seg.rotation)
      if (seg.rotation.x > xyRotationClamp) {
        // console.log('out of bounds')
        seg.rotation.x = xyRotationClamp
      } else if (seg.rotation.x < -xyRotationClamp) {
        // console.log('out of bounds')
        seg.rotation.x = -xyRotationClamp
      } else if (seg.rotation.y > xyRotationClamp) {
        // console.log('out of bounds')
        seg.rotation.y = xyRotationClamp
      } else if (seg.rotation.y < -xyRotationClamp) {
        // console.log('out of bounds')
        seg.rotation.y = -xyRotationClamp
      }

      

      // const scaleRange = 0.01
      // const scaleAmount = _.random(-scaleRange, scaleRange)
      // seg.scale.x = seg.scale.x + scaleAmount
      // seg.scale.y = seg.scale.x + scaleAmount
      // seg.scale.z = seg.scale.x + scaleAmount
      // const maxScale = 1
      // if (seg.scale.x > maxScale) {
      //   seg.scale.set(maxScale,maxScale,maxScale)
      // }

    })
  }
  base.rotateZ(0.01)
  // controls.update()
  if (SETTINGS.useComposer) {
    composer.reset()
    composer.render(scene, camera)
    composer.pass(bloomPass)
    composer.pass(fxaaPass)
    composer.toScreen()
  }else {
    renderer.render(scene, camera)
  }
}




//    budo src/index.js --ssl --live --cors -- -t babelify
       