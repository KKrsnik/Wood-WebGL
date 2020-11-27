import * as WebGL from './WebGL.js';
import shaders from './shaders.js';


const mat4 = glMatrix.mat4;
const vec3 = glMatrix.vec3;

// This class prepares all assets for use with WebGL
// and takes care of rendering.

export default class Renderer {

    constructor(gl) {
        this.gl = gl;
        var ext = gl.getExtension('WEBGL_depth_texture');
        this.glObjects = new Map();
        this.programs = WebGL.buildPrograms(gl, shaders);

        gl.clearColor(1, 1, 1, 1);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        this.lightHeight = 50;


        this.createShadowMapBuffer();
    }


    createShadowMapBuffer() {
        const gl = this.gl;

        const shadowMap = WebGL.createTexture(gl, {
            width: 512,
            height: 512,
            iformat: gl.DEPTH_COMPONENT24,
            format: gl.DEPTH_COMPONENT,
            min: gl.NEAREST,
            mag: gl.NEAREST,
            type: gl.UNSIGNED_INT,
        });

        const shadowBuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, shadowBuffer);

        // Attach the texture to the framebuffer.

        gl.framebufferTexture2D(
            // This has to be gl.FRAMEBUFFER for historical reasons.
            gl.FRAMEBUFFER,

            // Attach the texture to the 0-th color attachment of the framebuffer.
            // There is also gl.DEPTH_ATTACHMENT if you need a depth buffer.
            // You can have multiple color attachments (at least 4), which you
            // can write into by specifying multiple fragment shader outputs.
            gl.DEPTH_ATTACHMENT,

            // We have to specify the texture target. This is useful for
            // rendering into different faces of a cubemap texture.
            gl.TEXTURE_2D,

            // Our texture object.
            shadowMap,

            // The mipmap level of the texture.
            0
        );
    }


    prepareBufferView(bufferView) {
        if (this.glObjects.has(bufferView)) {
            return this.glObjects.get(bufferView);
        }

        const buffer = new DataView(
            bufferView.buffer,
            bufferView.byteOffset,
            bufferView.byteLength);
        const glBuffer = WebGL.createBuffer(this.gl, {
            target: bufferView.target,
            data: buffer
        });
        this.glObjects.set(bufferView, glBuffer);
        return glBuffer;
    }

    prepareSampler(sampler) {
        if (this.glObjects.has(sampler)) {
            return this.glObjects.get(sampler);
        }

        const glSampler = WebGL.createSampler(this.gl, sampler);
        this.glObjects.set(sampler, glSampler);
        return glSampler;
    }

    prepareImage(image) {
        if (this.glObjects.has(image)) {
            return this.glObjects.get(image);
        }

        const glTexture = WebGL.createTexture(this.gl, {image});
        this.glObjects.set(image, glTexture);
        return glTexture;
    }

    prepareTexture(texture) {
        const gl = this.gl;

        this.prepareSampler(texture.sampler);
        const glTexture = this.prepareImage(texture.image);

        const mipmapModes = [
            gl.NEAREST_MIPMAP_NEAREST,
            gl.NEAREST_MIPMAP_LINEAR,
            gl.LINEAR_MIPMAP_NEAREST,
            gl.LINEAR_MIPMAP_LINEAR,
        ];

        if (!texture.hasMipmaps && mipmapModes.includes(texture.sampler.min)) {
            gl.bindTexture(gl.TEXTURE_2D, glTexture);
            gl.generateMipmap(gl.TEXTURE_2D);
            texture.hasMipmaps = true;
        }
    }

    prepareMaterial(material) {
        if (material.baseColorTexture) {
            this.prepareTexture(material.baseColorTexture);
        }
        if (material.metallicRoughnessTexture) {
            this.prepareTexture(material.metallicRoughnessTexture);
        }
        if (material.normalTexture) {
            this.prepareTexture(material.normalTexture);
        }
        if (material.occlusionTexture) {
            this.prepareTexture(material.occlusionTexture);
        }
        if (material.emissiveTexture) {
            this.prepareTexture(material.emissiveTexture);
        }
    }

    preparePrimitive(primitive) {
        if (this.glObjects.has(primitive)) {
            return this.glObjects.get(primitive);
        }

        this.prepareMaterial(primitive.material);

        const gl = this.gl;
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        if (primitive.indices) {
            const bufferView = primitive.indices.bufferView;
            bufferView.target = gl.ELEMENT_ARRAY_BUFFER;
            const buffer = this.prepareBufferView(bufferView);
            gl.bindBuffer(bufferView.target, buffer);
        }

        // this is an application-scoped convention, matching the shader
        const attributeNameToIndexMap = {
            POSITION: 0,
            TEXCOORD_0: 1,
            NORMAL: 2,
        };

        for (const name in primitive.attributes) {
            const accessor = primitive.attributes[name];
            const bufferView = accessor.bufferView;
            const attributeIndex = attributeNameToIndexMap[name];

            if (attributeIndex !== undefined) {
                bufferView.target = gl.ARRAY_BUFFER;
                const buffer = this.prepareBufferView(bufferView);
                gl.bindBuffer(bufferView.target, buffer);
                gl.enableVertexAttribArray(attributeIndex);
                gl.vertexAttribPointer(
                    attributeIndex,
                    accessor.numComponents,
                    accessor.componentType,
                    accessor.normalized,
                    bufferView.byteStride,
                    accessor.byteOffset);
            }
        }

        this.glObjects.set(primitive, vao);
        return vao;
    }

    prepareMesh(mesh) {
        for (const primitive of mesh.primitives) {
            this.preparePrimitive(primitive);
        }
    }

    prepareNode(node) {
        if (node.mesh) {
            this.prepareMesh(node.mesh);
        }
        for (const child of node.children) {
            this.prepareNode(child);
        }
    }

    prepareScene(scene) {
        for (const node of scene.nodes) {
            this.prepareNode(node);
        }
    }

    getViewMatrix(camera) {
        const mvpMatrix = mat4.clone(camera.matrix);
        let parent = camera.parent;
        while (parent) {
            mat4.mul(mvpMatrix, parent.matrix, mvpMatrix);
            parent = parent.parent;
        }
        mat4.invert(mvpMatrix, mvpMatrix);
        //mat4.mul(mvpMatrix, camera.camera.matrix, mvpMatrix);
        return mvpMatrix;
    }

    render(scene, camera, light, dt) {

        const gl = this.gl;
        gl.clearColor(0.5, 0.8, 1.0, 1.0);

        //this.renderShadowMap(scene, light);

        // this.renderWater(scene, camera, light);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


        const program = this.programs;
        gl.useProgram(program.simple.program);
        gl.uniform1i(program.simple.uniforms.uTexture, 0);
        gl.uniform1i(program.simple.uniforms.uDepth, 1);

        const vMatrix = this.getViewMatrix(camera);
        const pMatrix = camera.camera.matrix;

        const lightWorldMatrix = mat4.create();
        mat4.lookAt(lightWorldMatrix, light.translation, [0, 0, 0], [0, 1, 0]);

        const lightPerspectiveMatrix = mat4.create();
        mat4.ortho(lightPerspectiveMatrix, -100, 100, -100, 100, -1, 200);

        const i = mat4.create();
        const j = mat4.create();
        mat4.invert(i, lightWorldMatrix);
        mat4.invert(j, lightPerspectiveMatrix);

        const textureMatrix = mat4.create();
        mat4.mul(textureMatrix, lightPerspectiveMatrix, lightWorldMatrix);


        //mat4.invert(textureMatrix, textureMatrix);
        const lightDirection = vec3.create();

        vec3.sub(lightDirection, [0, 0, 0], light.translation);


        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.shadowMap);


        gl.uniform3fv(program.simple.uniforms.uDirLight, light.translation);
        gl.uniform3fv(program.simple.uniforms.uDirColor, [0.0, 0.4, 1.0]);


        gl.uniform3fv(program.simple.uniforms.lightPos, [0, 10, 0]);
        gl.uniform3fv(program.simple.uniforms.lightColor, [1.0, 0.3, 0.0]);

        gl.uniform1f(program.simple.uniforms.Ka, 1.0);
        gl.uniform1f(program.simple.uniforms.Kd, 1.0);
        gl.uniform1f(program.simple.uniforms.Ks, 1.0);
        gl.uniform1f(program.simple.uniforms.shininessVal, 2.0);

        const weaponWorld = mat4.create();
        mat4.lookAt(weaponWorld, [-4, -100, 5], [-4, -100, -5], [0, 1, 0]);

        const weaponPerspective = mat4.create();
        mat4.perspective(weaponPerspective,
            1, 3,
            0.1, 10);

        let weapon;
        for (const node of scene.nodes) {
            this.renderNode(node, vMatrix, pMatrix, 0, textureMatrix);

            if (node.options.name === "Weapon") {
                weapon = node;
            }
            //this.renderNode(node, lightWorldMatrix, lightPerspectiveMatrix, 0, textureMatrix);
        }
        gl.clear(gl.DEPTH_BUFFER_BIT);
        // this.renderNode(weapon, weaponWorld, weaponPerspective, 0, textureMatrix);
    }

    renderNode(node, vMatrix, pMatrix, shaderProgram, textureMatrix) {
        const gl = this.gl;

        vMatrix = mat4.clone(vMatrix);
        pMatrix = mat4.clone(pMatrix);


        if (node.mesh) {
            this.program;
            if (shaderProgram === 0) {
                this.program = this.programs.simple;

                //gl.uniformMatrix4fv(this.program.uniforms.uShadowTex, false, textureMatrix);


            } else if (shaderProgram === 1) {
                this.program = this.programs.depth;
            } else if (shaderProgram === 2) {
                this.program = this.programs.water;

                //gl.uniformMatrix4fv(this.program.uniforms.uShadowTex, false, textureMatrix);
            }
            gl.uniformMatrix4fv(this.program.uniforms.uVMatrix, false, vMatrix);
            gl.uniformMatrix4fv(this.program.uniforms.uPMatrix, false, pMatrix);
            gl.uniformMatrix4fv(this.program.uniforms.uMMatrix, false, node.matrix);
            const nMatrix = mat4.create();
            mat4.invert(nMatrix, node.matrix);
            gl.uniformMatrix4fv(this.program.uniforms.uNMatrix, false, nMatrix);
            for (const primitive of node.mesh.primitives) {
                //console.log(node.options.name);
                this.renderPrimitive(primitive);
            }
        }

        for (const child of node.children) {
            this.renderNode(child, vMatrix, pMatrix, shaderProgram, textureMatrix);
        }
    }

    renderPrimitive(primitive) {
        const gl = this.gl;

        const vao = this.glObjects.get(primitive);
        const material = primitive.material;
        const texture = material.baseColorTexture;
        const glTexture = this.glObjects.get(texture.image);
        const glSampler = this.glObjects.get(texture.sampler);

        gl.bindVertexArray(vao);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, glTexture);
        gl.bindSampler(0, glSampler);

        if (primitive.indices) {
            const mode = primitive.mode;
            const count = primitive.indices.count;
            const type = primitive.indices.componentType;
            gl.drawElements(mode, count, type, 0);
        } else {
            const mode = primitive.mode;
            const count = primitive.attributes.POSITION.count;
            gl.drawArrays(mode, 0, count);
        }
    }

    renderShadowMap(scene, light) {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowBuffer);
        gl.viewport(0, 0, 512, 512);

        gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

        const lightWorldMatrix = mat4.create();
        mat4.lookAt(lightWorldMatrix, light.translation, [0, 0, 0], [0, 1, 0]);

        const lightPerspectiveMatrix = mat4.create();
        mat4.ortho(lightPerspectiveMatrix, -100, 100, -100, 100, -1, 200);

        const program = this.programs;
        gl.useProgram(program.depth.program);

        for (const node of scene.nodes) {
            this.renderNode(node, lightWorldMatrix, lightPerspectiveMatrix, 1);
        }

    }

    renderWater(scene, camera, light) {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.clearDepth(1.0);


        const program = this.programs;
        gl.useProgram(program.water.program);
        gl.uniform1i(program.water.uniforms.uTexture, 0);
        gl.uniform1i(program.water.uniforms.uDepth, 1);

        const vMatrix = this.getViewMatrix(camera);
        const pMatrix = camera.camera.matrix;

        const lightWorldMatrix = mat4.create();
        mat4.lookAt(lightWorldMatrix, light.translation, [0, 0, 0], [0, 1, 0]);

        const lightPerspectiveMatrix = mat4.create();
        mat4.perspective(lightPerspectiveMatrix,
            1.0, 3.6623748211731044,
            1, 1000);
        const i = mat4.create();

        mat4.invert(i, lightPerspectiveMatrix);

        const textureMatrix = mat4.create();

        mat4.mul(textureMatrix, i, lightWorldMatrix);

        const lightDirection = vec3.create();

        vec3.sub(lightDirection, [0, 0, 0], light.translation);


        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.shadowMap);


        gl.uniform3fv(program.water.uniforms.uDirLight, light.translation);
        gl.uniform3fv(program.water.uniforms.uDirColor, [0.0, 0.4, 1.0]);


        gl.uniform3fv(program.water.uniforms.lightPos, [40, 3, -30]);
        gl.uniform3fv(program.water.uniforms.lightColor, [1.0, 0.3, 0.0]);

        let d = new Date();
        let n = d.getTime();

        let t = n % 10 / 100;

        gl.uniform1f(program.water.uniforms.t, this.t);

        gl.uniform1f(program.water.uniforms.Ka, 1.0);
        gl.uniform1f(program.water.uniforms.Kd, 1.0);
        gl.uniform1f(program.water.uniforms.Ks, 1.0);
        gl.uniform1f(program.water.uniforms.shininessVal, 2.0);


        for (const node of scene.nodes) {
            if (node.options.name === "Water")
                this.renderNode(node, vMatrix, pMatrix, 2, textureMatrix);

            //this.renderNode(node, lightWorldMatrix, lightPerspectiveMatrix, 0, textureMatrix);
        }
    }

}
