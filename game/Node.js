const vec3 = glMatrix.vec3;
const mat4 = glMatrix.mat4;
const quat = glMatrix.quat;

export default class Node {

    constructor(options = {}) {
        this.options = options;
        this.translation = options.translation
            ? vec3.clone(options.translation)
            : vec3.fromValues(0, 0, 0);
        this.rotation = options.rotation
            ? quat.clone(options.rotation)
            : quat.fromValues(0, 0, 0, 1);
        this.scale = options.scale
            ? vec3.clone(options.scale)
            : vec3.fromValues(1, 1, 1);
        this.matrix = options.matrix
            ? mat4.clone(options.matrix)
            : mat4.create();

        this.body = {
            type: 'box',
            pos: options.translation
                ? vec3.clone(options.translation)
                : vec3.fromValues(0, 0, 0),
            size: options.scale
                ? vec3.clone(options.scale)
                : vec3.fromValues(1, 1, 1),
            rot: [0, 0, 0],
            move: false,
            density: 1,
            friction: 0.2,
            restitution: 0.2,
            belongsTo: 1,
            collidesWith: 0xffffffff,
        };
        // this.negScale = new Float32Array(3)
        // for (let i = 0; i < 3; i++) {
        //     if (options.name === "Plane" && i === 1) {
        //         this.scale[i] = 0.1
        //     }
        //     this.negScale[i] = -this.scale[i]
        // }
        // this.aabb = {
        //     min: this.negScale,
        //     max: this.scale,
        // };

        this.fizik;

        this.rotationDeg = [0, 0, 0];

        if (options.matrix) {
            this.updateMatrix();
        } else if (options.translation || options.rotation || options.scale) {
            if (options.name === "Camera") {
                this.body.move = true;
                // this.body.move = true;
                this.updateTransform();
            } else {
                this.updateMatrix();
            }

        }

        this.camera = options.camera || null;
        this.mesh = options.mesh || null;


        this.children = [...(options.children || [])];
        for (const child of this.children) {
            child.parent = this;
        }
        this.parent = null;

    }

    updateTransform() {
        const t = this.matrix;
        const degrees = this.rotationDeg.map(x => x * 180 / Math.PI);
        const q = quat.fromEuler(quat.create(), ...degrees);
        const v = vec3.clone(this.translation);
        const s = vec3.clone(this.scale);
        mat4.fromRotationTranslationScale(t, q, v, s);
    }

    updateMatrix() {
        mat4.fromRotationTranslationScale(
            this.matrix,
            this.rotation,
            this.translation,
            this.scale);
    }

    addChild(node) {
        this.children.push(node);
        node.parent = this;
    }

    removeChild(node) {
        const index = this.children.indexOf(node);
        if (index >= 0) {
            this.children.splice(index, 1);
            node.parent = null;
        }
    }

    clone() {
        return new Node({
            ...this,
            children: this.children.map(child => child.clone()),
        });
    }

    getGlobalTransform() {
        console.log(this.options)
        console.log(this)
        if (!this.parent) {
            return mat4.clone(this.matrix);
        } else {
            let transform = this.parent.getGlobalTransform();
            return mat4.mul(transform, transform, this.matrix);
        }
    }

}
