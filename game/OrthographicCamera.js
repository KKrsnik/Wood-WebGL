import Camera from './Camera.js';

const mat4 = glMatrix.mat4;

export default class OrthographicCamera extends Camera {

    constructor(options = {}) {
        super(options);

        this.matrix = mat4.create();

        this.aspect = options.aspect || 5;
        this.fov = 2.0;
        this.near = options.near || 1;
        this.far = options.far || Infinity;


        this.updateMatrix();
    }

    updateMatrix() {
        mat4.perspective(this.matrix,
            this.fov, this.aspect,
            this.near, this.far);
    }

}
