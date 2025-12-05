import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
// ❌ Removido: DRACOLoader (não precisas, causava 404)
// import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";

class SelectiveBloomCubes {
  constructor() {
    this.bloom = false;
    this.tcontrol = null;
    this.axisVisible = false;
    this.gridVisible = false;
    this.orbitControls = false;
    this.mouseMoveAnim = false;
    this.delay = 1;
    this.gModel = new THREE.Group();
    this.gMain = new THREE.Group();
    this.params = {
      threshold: 0,
      strength: 2,
      radius: 0.4,
      exposure: 1,
    };
    this.modlePosition = {
      x: -4,
      y: 1.493,
      z: 2.146,
    };
    this.init();
    this.initBloom();
    this.addCubes();
    this.addLights();
    this.animate();
    document.body.style.overflow = "hidden";

    if (window.innerWidth < 500) {
      this.modlePosition = {
        x: 2,
        y: 1.493,
        z: 2.146,
      };
    }
  }

  init() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: document.getElementById("drawcanvas"),
      alpha: true,
    });

    // ❌ REMOVIDO - DRACO LOADER (causava erro e nem era necessário)
    // const dracoLoader = new DRACOLoader();
    // dracoLoader.setDecoderPath("https://abc-xyz.b-cdn.net/prismore/index-96witzP7.js");
    // this.gltfLoader = new GLTFLoader();
    // this.gltfLoader.setDRACOLoader(dracoLoader);

    // ✅ GLTFLoader normal
    this.gltfLoader = new GLTFLoader();

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.scene = new THREE.Scene();

    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 10;

    this.camera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      100
    );

    this.camera.position.set(0, -1, 6);

    this.scene.fog = new THREE.FogExp2(0x000000, 0.03);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.axis = new THREE.AxesHelper(10);
    this.grid = new THREE.GridHelper(50, 50);
    this.axis.visible = false;
    this.grid.visible = false;
    this.scene.add(this.axis);
    this.scene.add(this.grid);
    this.controls.enabled = this.orbitControls;

    this.scene.add(this.gMain);
    this.gMain.add(this.gModel);
    this.gMain.position.set(0, 0, 0);
    this.gModel.position.set(0, 0, 0);
  }

  initBloom() {
    this.BLOOM_SCENE = 1;
    this.bloomLayer = new THREE.Layers();
    this.bloomLayer.set(this.BLOOM_SCENE);

    this.darkMaterial = new THREE.MeshBasicMaterial({ color: "black" });
    this.materials = {};

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.params.strength,
      this.params.radius,
      this.params.threshold
    );

    this.bloomComposer = new EffectComposer(this.renderer);
    this.bloomComposer.renderToScreen = false;
    this.bloomComposer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomComposer.addPass(this.bloomPass);

    this.finalComposer = new EffectComposer(this.renderer);
    this.finalComposer.addPass(new RenderPass(this.scene, this.camera));

    this.finalPass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: this.bloomComposer.renderTarget2.texture },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D baseTexture;
          uniform sampler2D bloomTexture;
          varying vec2 vUv;
          void main() {
            vec4 base = texture2D(baseTexture, vUv);
            vec4 bloom = texture2D(bloomTexture, vUv);
            gl_FragColor = vec4(base.rgb + bloom.rgb, base.a);
          }
        `,
      }),
      "baseTexture"
    );

    this.finalPass.needsSwap = true;
    this.finalComposer.addPass(this.finalPass);
  }

  addCubes() {
    const tl = gsap.timeline();

    // ✅ CORRIGIDO: URL DO MODELO
    this.gltfLoader.load(
      "https://cdn.jsdelivr.net/gh/twbananas/prismore-three-animation/public/prismore5.glb",
      (gltf) => {
        const model = gltf.scene;

        model.position.set(0, 0, 0);
        model.scale.set(0.2, 0.2, 0.1);

        model.traverse((child) => {
          if (child.isMesh) {
            child.material.metalness = 0.1;
            child.material.roughness = 0.5;
            child.material.color.set("#6EB744");
            child.material.depthTest = true;
            child.material.depthWrite = true;
            child.material.transparent = true;
            child.material.opacity = 0;

            tl.to(child.material, {
              opacity: 1,
              duration: 3,
              ease: "power2.inOut",
            });
          }
        });

        this.gModel.add(model);

        tl.to(this.gModel.scale, {
          x: 7.5,
          y: 7.5,
          z: 7.5,
          duration: 1,
          ease: "power2.inOut",
        });

        tl.fromTo(
          this.gModel.position,
          { x: 0, y: 0, z: 0 },
          {
            x: this.modlePosition.x,
            y: this.modlePosition.y,
            z: this.modlePosition.z,
            duration: 1,
            ease: "power2.inOut",
            onComplete: () => {
              document.body.style.overflow = "auto";
            },
          }
        );

        const numberOfClones = 60;
        let cloneModels = [];

        for (let i = 0; i < numberOfClones; i++) {
          const clone = model.clone();
          this.gModel.add(clone);
          cloneModels.push(clone);
        }

        for (let i = 1; i < numberOfClones; i++) {
          gsap.to(cloneModels[i].rotation, {
            z: -(Math.PI / 1000) * i,
            duration: 1,
            delay: this.delay,
          });
          gsap.to(cloneModels[i].position, {
            z: -i * 0.03,
            duration: 1,
            delay: this.delay,
          });
        }
      }
    );

    ScrollTrigger.create({
      trigger: document.querySelector(".section2"),
      start: "top 80%",
      end: "bottom bottom",
      onEnter: () => (this.mousemoveactive = true),
      onEnterBack: () => (this.mousemoveactive = true),
      onLeave: () => (this.mousemoveactive = true),
      onLeaveBack: () => (this.mousemoveactive = true),
    });
  }

  addLights() {
    const ambientLight = new THREE.AmbientLight("#2a2a2a", 0.3);
    this.scene.add(ambientLight);

    const light = new THREE.PointLight("#74A552", 200);
    const light1 = new THREE.PointLight("#74A552", 50);
    const light2 = new THREE.PointLight("#74A552", 150);
    const light3 = new THREE.PointLight("#74A552", 150);
    const light4 = new THREE.PointLight("#74A552", 50);

    const darkAccent1 = new THREE.PointLight("#1a1a1a", 80);
    const darkAccent2 = new THREE.PointLight("#2d2d2d", 60);

    light.position.set(4.486, 13.285, -20.608);
    light1.position.set(-1.124, -4, -0.961);
    light2.position.set(-4.584, 1.934, -0.118);
    light3.position.set(4.567, 3.043, 0.722);
    light4.position.set(2.037, -3.544, -0.579);

    darkAccent1.position.set(0, -8, -5);
    darkAccent2.position.set(-6, 2, 3);

    this.scene.add(light, light1, light2, light3, light4, darkAccent1, darkAccent2);
  }

  darkenNonBloomed(obj) {
    if (obj.isMesh && this.bloomLayer.test(obj.layers) === false) {
      this.materials[obj.uuid] = obj.material;
      obj.material = this.darkMaterial;
    }
  }

  restoreMaterial(obj) {
    if (this.materials[obj.uuid]) {
      obj.material = this.materials[obj.uuid];
      delete this.materials[obj.uuid];
    }
  }

  render() {
    if (this.bloom) {
      this.scene.traverse(this.darkenNonBloomed.bind(this));
      this.bloomComposer.render();
      this.scene.traverse(this.restoreMaterial.bind(this));

      this.finalPass.uniforms["baseTexture"].value =
        this.finalComposer.readBuffer.texture;
      this.finalPass.uniforms["bloomTexture"].value =
        this.bloomComposer.renderTarget2.texture;
      this.finalComposer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    this.controls.update();
    this.render();
  }
}

new SelectiveBloomCubes();
