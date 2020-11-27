import Application from '../../common/Application.js';

import Renderer from './Renderer.js';
import Physics from './Physics.js';
import Camera from './Camera.js';
import SceneLoader from './SceneLoader.js';
import SceneBuilder from './SceneBuilder.js';
import GLTFLoader from './GLTFLoader.js';

import OrthographicCamera from './OrthographicCamera.js';

class App extends Application {

    async start() {
        this.time = Date.now();
        this.startTime = this.time;
        this.aspect = 1;

        this.pointerlockchangeHandler = this.pointerlockchangeHandler.bind(this);
        document.addEventListener('pointerlockchange', this.pointerlockchangeHandler);

        this.loader = new GLTFLoader();
        await this.loader.load('./common/models/The Islands - Copy/islands.gltf');

        // this.initOimoPhysics();
        this.scene = await this.loader.loadScene(this.loader.defaultScene);
        this.camera = await this.loader.loadNode('Camera');

        if (!this.scene || !this.camera) {
            throw new Error('Scene or Camera not present in glTF');
        }

        if (!this.camera.camera) {
            throw new Error('Camera node does not contain a camera reference');
        }

        this.physics = new Physics(this.scene);
        this.renderer = new Renderer(this.gl);
        this.renderer.prepareScene(this.scene);
        this.resize();

        this.scene.traverse(node => {
            if (node.options.name === "Light") {
                this.light = node;
            }
        });

        //this.light.camera = new OrthographicCamera();
    }

    /*
    async load(uri) {
        const scene = await new SceneLoader().loadScene('scene.json');
        const builder = new SceneBuilder(scene);
        this.scene = builder.build();
        this.physics = new Physics(this.scene);

        // Find first camera.
        this.camera = null;
        this.scene.traverse(node => {
            if (node instanceof Camera) {
                this.camera = node;
            }
        });

        this.camera.aspect = this.aspect;
        this.camera.updateProjection();
        this.renderer.prepare(this.scene);
    }
    */
    enableCamera() {
        this.canvas.requestPointerLock();
    }

    pointerlockchangeHandler() {
        if (!this.camera) {
            return;
        }

        if (document.pointerLockElement === this.canvas) {
            this.camera.camera.enable();
        } else {
            this.camera.camera.disable();
        }
    }

    update() {
        const t = this.time = Date.now();
        const dt = (this.time - this.startTime) * 0.001;
        this.startTime = this.time;

        if (this.camera) {
            this.camera.camera.setTransformation(this.camera);
            this.camera.camera.update(dt);
        }

        if (this.physics) {
            this.physics.update(dt);
        }
    }

    render() {
        const t = this.time = Date.now();
        const dt = (this.time - this.startTime) * 0.001;
        if (this.renderer) {
            this.renderer.render(this.scene, this.camera, this.light, dt);
        }
    }

    resize() {
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;
        const aspectRatio = w / h;

        if (this.camera) {
            this.camera.camera.aspect = aspectRatio;
            this.camera.camera.updateMatrix();
        }
    }

}

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.querySelector('canvas');
    const app = new App(canvas);
    const gui = new dat.GUI();
    gui.add(app, 'enableCamera');
});
