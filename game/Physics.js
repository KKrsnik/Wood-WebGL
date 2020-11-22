const vec3 = glMatrix.vec3;
const mat4 = glMatrix.mat4;

export default class Physics {

    constructor(scene) {
        this.scene = scene;
        this.world = new OIMO.World({info: true, worldscale: 100, gravity: [0, 0, 0]});

        this.scene.traverse(node => {
            console.log(node);
            console.log(this.world);
            node.fizik = this.world.add(node.body);
            console.log(this.world);

        });
    }

    update(dt) {
        this.world.step();
        this.scene.traverse(node => {

                //node.rotation = mat4.clone(node.fizik.getQuaternion());
                /*
                let rot = node.fizik.getQuaternion();
                node.rotation[0] = rot.x;
                node.rotation[1] = rot.y;
                node.rotation[2] = rot.z;
                node.rotation[3] = rot.w;
                */
                //node.translation = mat4.clone(node.fizik.getPosition());

                let pos = node.fizik.getPosition();
                node.translation[0] = pos.x;
                node.translation[1] = pos.y;
                node.translation[2] = pos.z;
                node.translation[3] = pos.w;

                node.updateMatrix();
        });
    }

    intervalIntersection(min1, max1, min2, max2) {
        return !(min1 > max2 || min2 > max1);
    }

    aabbIntersection(aabb1, aabb2) {
        return this.intervalIntersection(aabb1.min[0], aabb1.max[0], aabb2.min[0], aabb2.max[0])
            && this.intervalIntersection(aabb1.min[1], aabb1.max[1], aabb2.min[1], aabb2.max[1])
            && this.intervalIntersection(aabb1.min[2], aabb1.max[2], aabb2.min[2], aabb2.max[2]);
    }

    // resolveCollision(a, b) {
    //     // Update bounding boxes with global translation.
    //     const ta = a.getGlobalTransform();
    //     const tb = b.getGlobalTransform();
    //
    //     const posa = mat4.getTranslation(vec3.create(), ta);
    //     const posb = mat4.getTranslation(vec3.create(), tb);
    //
    //     const mina = vec3.add(vec3.create(), posa, a.aabb.min);
    //     const maxa = vec3.add(vec3.create(), posa, a.aabb.max);
    //     const minb = vec3.add(vec3.create(), posb, b.aabb.min);
    //     const maxb = vec3.add(vec3.create(), posb, b.aabb.max);
    //
    //     // Check if there is collision.
    //     const isColliding = this.aabbIntersection({
    //         min: mina,
    //         max: maxa
    //     }, {
    //         min: minb,
    //         max: maxb
    //     });
    //
    //     if (!isColliding) {
    //         return;
    //     }
    //
    //     // Move node A minimally to avoid collision.
    //     const diffa = vec3.sub(vec3.create(), maxb, mina);
    //     const diffb = vec3.sub(vec3.create(), maxa, minb);
    //
    //     let minDiff = Infinity;
    //     let minDirection = [0, 0, 0];
    //     if (diffa[0] >= 0 && diffa[0] < minDiff) {
    //         minDiff = diffa[0];
    //         minDirection = [minDiff, 0, 0];
    //     }
    //     if (diffa[1] >= 0 && diffa[1] < minDiff) {
    //         minDiff = diffa[1];
    //         minDirection = [0, minDiff, 0];
    //     }
    //     if (diffa[2] >= 0 && diffa[2] < minDiff) {
    //         minDiff = diffa[2];
    //         minDirection = [0, 0, minDiff];
    //     }
    //     if (diffb[0] >= 0 && diffb[0] < minDiff) {
    //         minDiff = diffb[0];
    //         minDirection = [-minDiff, 0, 0];
    //     }
    //     if (diffb[1] >= 0 && diffb[1] < minDiff) {
    //         minDiff = diffb[1];
    //         minDirection = [0, -minDiff, 0];
    //     }
    //     if (diffb[2] >= 0 && diffb[2] < minDiff) {
    //         minDiff = diffb[2];
    //         minDirection = [0, 0, -minDiff];
    //     }
    //
    //     vec3.add(a.translation, a.translation, minDirection);
    //     a.updateTransform();
    // }

}
