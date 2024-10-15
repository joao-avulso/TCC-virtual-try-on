import * as THREE from "three";
export class ObjectControls {
    constructor(object, domElement, rotationVector) {
        this.object = object;
        this.domElement = domElement || document;
        this.rotationVector = rotationVector || new THREE.Vector3(0, 0, 1);
        this.originQuaternion = this.object.quaternion.clone();

        this.enabled = true;
        this.rotationSpeed = 0.01;

        this.state = "none";

        this.mouseStart = new THREE.Vector2();
        this.mouseEnd = new THREE.Vector2();

        this.domElement.addEventListener("mousedown", this.onMouseDown.bind(this), false);
        this.domElement.addEventListener("mousemove", this.onMouseMove.bind(this), false);
        this.domElement.addEventListener("mouseup", this.onMouseUp.bind(this), false);
    }

    onMouseDown(event) {
        if (event.button === 0) {
            // Left mouse button
            this.state = "rotate";
            this.mouseStart.set(event.clientX, event.clientY);
        }
    }

    onMouseMove(event) {
        if (!this.enabled) return;

        this.mouseEnd.set(event.clientX, event.clientY);

        if (this.state === "rotate") {
            this.rotate();
        }

        this.mouseStart.copy(this.mouseEnd);
    }

    onMouseUp() {
        this.state = "none";
    }

    rotate() {
        this.object.rotateOnWorldAxis(this.rotationVector, (this.mouseEnd.x - this.mouseStart.x) * this.rotationSpeed);
    }

    resetRotation() {
        if (this.state != "rotate") {
            this.object.quaternion.rotateTowards(this.originQuaternion, 0.2);
        }
    }
}