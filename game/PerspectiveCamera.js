import Camera from './Camera.js';

const mat4 = glMatrix.mat4;
const vec3 = glMatrix.vec3;
const quat = glMatrix.quat;

export default class PerspectiveCamera extends Camera {

    constructor(options = {}) {
        super(options);

        this.matrix = mat4.create();

        this.aspect = options.aspect || 1.5;
        this.fov = 1.0;
        this.near = options.near || 1;
        this.far = options.far || Infinity;
        this.velocity = vec3.fromValues(0, 0, 0);
        this.mouseSensitivity = 0.002;
        this.maxSpeed = 3;
        this.friction = 0.2;
        this.acceleration = 20;

        this.jump = false;

        this.updateMatrix();

        this.mousemoveHandler = this.mousemoveHandler.bind(this);
        this.keydownHandler = this.keydownHandler.bind(this);
        this.keyupHandler = this.keyupHandler.bind(this);
        this.keys = {};
    }

    setTransformation(tranformacija) {
        this.transformacija = tranformacija;
    }

    updateMatrix() {
        mat4.perspective(this.matrix,
            this.fov, this.aspect,
            this.near, this.far);
    }

    update(dt) {

        const c = this.transformacija;

        const forward = vec3.set(vec3.create(),
            -Math.sin(c.rotationDeg[1]), 0, -Math.cos(c.rotationDeg[1]));
        const right = vec3.set(vec3.create(),
            Math.cos(c.rotationDeg[1]), 0, -Math.sin(c.rotationDeg[1]));

        const gravity = vec3.set(vec3.create(), 0, 1, 0);



        // 1: add movement acceleration
        let acc = vec3.create();
        if (this.keys['KeyW']) {
            vec3.add(acc, acc, forward);
        }
        if (this.keys['KeyS']) {
            vec3.sub(acc, acc, forward);
        }
        if (this.keys['KeyD']) {
            vec3.add(acc, acc, right);
        }
        if (this.keys['KeyA']) {
            vec3.sub(acc, acc, right);
        }
        if (this.keys['Space']) {
            vec3.add(acc, acc, gravity);
        }
        if (!this.keys['Space']) {
            vec3.sub(acc, acc, gravity);
        }


        // 2: update velocity
        vec3.scaleAndAdd(this.velocity, this.velocity, acc, dt * this.acceleration);

        // 3: if no movement, apply friction
        if (!this.keys['KeyW'] &&
            !this.keys['KeyS'] &&
            !this.keys['KeyD'] &&
            !this.keys['KeyA']) {
            vec3.scale(this.velocity, this.velocity, 1 - this.friction);
        }

        // 4: limit speed
        const len = vec3.len(this.velocity);
        if (len > this.maxSpeed) {
            vec3.scale(this.velocity, this.velocity, this.maxSpeed / len);
        }

    }

    enable() {
        document.addEventListener('mousemove', this.mousemoveHandler);
        document.addEventListener('keydown', this.keydownHandler);
        document.addEventListener('keyup', this.keyupHandler);
    }

    disable() {
        document.removeEventListener('mousemove', this.mousemoveHandler);
        document.removeEventListener('keydown', this.keydownHandler);
        document.removeEventListener('keyup', this.keyupHandler);

        for (let key in this.keys) {
            this.keys[key] = false;
        }
    }

    mousemoveHandler(e) {
        const dx = e.movementX;
        const dy = e.movementY;
        const c = this.transformacija;


        c.rotationDeg[0] -= dy * this.mouseSensitivity;
        c.rotationDeg[1] -= dx * this.mouseSensitivity;

        const pi = Math.PI;
        const twopi = pi * 2;
        const halfpi = pi / 2;

        if (c.rotationDeg[0] > halfpi) {
            c.rotationDeg[0] = halfpi;
        }
        if (c.rotationDeg[0] < -halfpi) {
            c.rotationDeg[0] = -halfpi;
        }

        c.rotationDeg[1] = ((c.rotationDeg[1] % twopi) + twopi) % twopi;
    }

    keydownHandler(e) {
        this.keys[e.code] = true;
    }

    keyupHandler(e) {
        this.keys[e.code] = false;
    }


}
