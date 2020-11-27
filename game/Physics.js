import Enemy from './Enemy.js';
import Weapon from './Weapon.js';

const vec3 = glMatrix.vec3;
const mat4 = glMatrix.mat4;

export default class Physics {

    constructor(scene) {
        this.scene = scene;
        this.world = new OIMO.World({
            timestep: 1/60,
            iterations: 8,
            broadphase: 2, // 1 brute force, 2 sweep and prune, 3 volume tree
            worldscale: 1, // scale full world
            random: true,  // randomize sample
            info: false,   // calculate statistic or not
            gravity: [0, -9.8, 0]
        });

        this.enemyCount = 0;
        this.win = false;
        this.timeLeft = 45.0;
        this.slain = 0;

        this.scene.traverse(node => {
            console.log(node);
            if(node.camera){
              node.fizik = this.world.add(node.body);
              console.log(node);
            }
            if(node.options.name === "Cube"){
              node.fizik = this.world.add(node.body);
            }
            if(node.options.name === "Cube.001"){
              node.fizik = this.world.add(node.body);
            }
            if(node.options.name === "Plane"){
              node.fizik = this.world.add(node.body);
            }
            if(node.options.name === "Enemy"){
              node.fizik = this.world.add(node.body);
              node.enemy = new Enemy(node);
              this.enemyCount++;
            }
            if(node.options.name === "Weapon"){
              node.weapon = new Weapon(node);
            }
        });
    }

    update(dt) {
        this.world.step();
        this.scene.traverse(node => {
            if (node.camera && node.options.name === "Camera") {
                //node.fizik.applyImpulse({x: 0, y: 0, z: 0}, node.camera.getVelocity());
                let v = node.camera.getVelocity();
                node.fizik.linearVelocity.set(v.x, v.y, v.z);

                //console.log(node.translation, node.fizik.pos);

                let pos = node.fizik.getPosition();
                node.translation[0] = pos.x;
                node.translation[1] = pos.y;
                node.translation[2] = pos.z;
                node.updateTransform();
                if(pos.y < -20){
                    node.fizik.resetPosition(0,0,0);
                }

                this.scene.traverse(w => {
                    if(w.weapon){
                        w.weapon.update(dt, node, w.matrix);
                        w.updateTransform();
                    }
                });

                if(node.camera.isAttacking()){
                    this.scene.traverse(enemy => {
                        if(enemy.enemy){
                            let a = node.fizik.getPosition();
                            let b = enemy.fizik.getPosition();
                            let x = Math.abs(a.x - b.x);
                            let y = Math.abs(a.y - b.y);
                            let z = Math.abs(a.z - b.z);

                            let dist = x + y + z;
                            if(dist < 5.0){
                              enemy.fizik.resetPosition(-100, -200, -100);
                              var audio = new Audio('common/sounds/death2.mp3');
                              audio.play();
                              this.enemyCount--;
                              this.slain++;
                            }
                        }

                    });
                }
            }
            if (node.enemy){
                node.enemy.update(dt);
                node.fizik.applyImpulse({x : 0, y : 0, z : 0}, node.enemy.getVelocity());
                let pos = node.fizik.getPosition();
                node.translation[0] = pos.x;
                node.translation[1] = pos.y;
                node.translation[2] = pos.z;
                node.updateTransform();

                let x = Math.abs(pos.x);
                let y = Math.abs(pos.y);
                let z = Math.abs(pos.z);

                let dist = x + z;
                //console.log(dist);
                if(dist < 5){
                    //console.log("hehe");
                    node.fizik.resetPosition(0, -200, 0);
                    this.enemyCount--;
                    this.timeLeft -= 2;
                }
            }
        });
        if(this.enemyCount === 0 && this.slain > 0){
            document.getElementById("win").style.visibility = "visible";
            document.exitPointerLock();
            this.win = true;
        }
        if(this.enemyCount === 0 && this.slain === 0 && !this.win){
            //console.log("enemy 0 slain 0");
            document.getElementById("lose").style.visibility = "visible";
            document.exitPointerLock();
        }
        if(this.timeLeft < 0 && !this.win ){
            //console.log("time");
            document.getElementById("lose").style.visibility = "visible";
            document.exitPointerLock();
        }

        document.getElementById("time").innerHTML = Math.ceil(this.timeLeft);
        document.getElementById("left").innerHTML = this.enemyCount;

        this.timeLeft -= dt;
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

    distance(a, b){
        let x = Math.abs(a[0] - b[0]);
        let y = Math.abs(a[1] - b[1]);
        let z = Math.abs(a[2] - b[2]);

        return x+y+z;
    }

}
