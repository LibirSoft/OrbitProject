const objects = [];
let mouseIsDown = false;
let idTimeout;
let lastMass = 0;
let position = {x: 0, y: 0};
let canMove = true;
let creation = null;

window.addEventListener('DOMContentLoaded', () => {

    window.addEventListener("keydown", e => {
        if (e.ctrlKey) {
            canMove = false;
        }
    })

    window.addEventListener("keyup", e => {
        if (e.keyCode === 17) {
            canMove = true;
        }
    })
    const canvas = document.querySelector('canvas');

    // Canvas'ın gerçek çözünürlüğünü ayarlayalım
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    canvas.addEventListener('mousedown', function (args) {
        mouseIsDown = true;
        lastMass = 0;
        position = {x: args.clientX, y: args.clientY};
        const object = createObject(position.x, position.y, lastMass, canMove,true);
        objects.push(object);
        creation = object.id;

        idTimeout = setInterval(function () {
            if (mouseIsDown) {
                object.mass += 100;
            }
        }, 100);
    });

    canvas.addEventListener('mouseup', function (args) {
        clearTimeout(idTimeout);
        if (mouseIsDown) {
            const object = objects.find(object => object.id === creation);
            object.ghost = false;
        }
        creation = null;
        position = {x: 0, y: 0};
        mouseIsDown = false;
    });

    setInterval(() => loop(canvas), 1000 / 320);
})

const loop = (canvas) => {
    const ctx = canvas.getContext("2d");
    clearCanvas(ctx, canvas.width, canvas.height);

    // apply Gravity
    for (const obj of objects) {

        applyGravity(obj, objects);
        draw(obj, ctx);
    }

}

const draw = (object, ctx) => {
    ctx.beginPath();
    ctx.arc(object.x, object.y, object.mass / 100, 0, 2 * Math.PI);
    ctx.fillStyle = object.color;
    ctx.fill();
    ctx.stroke();
}

const clearCanvas = (ctx, h, w) => {
    ctx.clearRect(0, 0, h, w);
}


const createObject = (posX, posY, mass, canMove,ghost) => {
    return {
        id: objects.length,
        x: posX,
        y: posY,
        mass: mass,
        canMove: canMove,
        color: getRandomColor(),
        velocityX: Math.random()*5 - 5,
        velocityY: Math.random()*5 - 5,
        ghost
    };
}

const getRandomColor = () => {
    let letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
};

const applyGravity = (obj, objects) => {
    if (!obj.canMove || obj.ghost) return;

    let forceX = 0;
    let forceY = 0;
    const G = 0.5; // Yerçekimi sabiti
    const dampening = 1; // Sürtünme etkisi

    for (const other of objects) {
        if (other === obj) continue;
        if (other.ghost) continue;

        const dx = other.x - obj.x;
        const dy = other.y - obj.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const minDistance = (obj.mass + other.mass) / 100;
        if (distance < minDistance) {
            handleCollision(obj, other);
            continue;
        }

        const force = G * (obj.mass * other.mass) / (distance * distance);

        forceX += force * (dx / distance);
        forceY += force * (dy / distance);
    }

    const accelerationX = forceX / obj.mass;
    const accelerationY = forceY / obj.mass;

    obj.velocityX = (obj.velocityX + accelerationX) * dampening;
    obj.velocityY = (obj.velocityY + accelerationY) * dampening;

    obj.x += obj.velocityX;
    obj.y += obj.velocityY;

    const radius = obj.mass / 100;
    if (obj.x < radius) {
        obj.x = radius;
        obj.velocityX *= -0.5;
    }
    if (obj.x > window.innerWidth - radius) {
        obj.x = window.innerWidth - radius;
        obj.velocityX *= -0.5;
    }
    if (obj.y < radius) {
        obj.y = radius;
        obj.velocityY *= -0.5;
    }
    if (obj.y > window.innerHeight - radius) {
        obj.y = window.innerHeight - radius;
        obj.velocityY *= -0.5;
    }
}

const handleCollision = (obj1, obj2) => {
    if (!obj1.canMove && !obj2.canMove) return;

    const dx = obj2.x - obj1.x;
    const dy = obj2.y - obj1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const normalX = dx / distance;
    const normalY = dy / distance;
    
    const relativeVelocityX = obj1.velocityX - (obj2.velocityX || 0);
    const relativeVelocityY = obj1.velocityY - (obj2.velocityY || 0);

    const relativeSpeed = Math.sqrt(relativeVelocityX * relativeVelocityX + relativeVelocityY * relativeVelocityY);
    
    if (relativeSpeed < 0.5 || !obj1.canMove || !obj2.canMove) {
        const targetObj = !obj1.canMove ? obj1 :
                         !obj2.canMove ? obj2 : 
                         (obj1.mass > obj2.mass ? obj1 : obj2);
        const otherObj = targetObj === obj1 ? obj2 : obj1;
        
        targetObj.mass += otherObj.mass;
        
        if (targetObj.canMove) {
            const totalMass = targetObj.mass;
            targetObj.velocityX = (targetObj.velocityX * (targetObj.mass - otherObj.mass) + 
                                 otherObj.velocityX * otherObj.mass) / totalMass;
            targetObj.velocityY = (targetObj.velocityY * (targetObj.mass - otherObj.mass) + 
                                 otherObj.velocityY * otherObj.mass) / totalMass;
        }
        
        const index = objects.indexOf(otherObj);
        if (index > -1) {
            objects.splice(index, 1);
        }
        
        return;
    }
    
    const impulse = 2 * (relativeVelocityX * normalX + relativeVelocityY * normalY)
        / (1 / obj1.mass + (obj2.canMove ? 1 / obj2.mass : 0));

    if (obj1.canMove) {
        obj1.velocityX -= (impulse * normalX) / obj1.mass;
        obj1.velocityY -= (impulse * normalY) / obj1.mass;
    }

    if (obj2.canMove) {
        obj2.velocityX += (impulse * normalX) / obj2.mass;
        obj2.velocityY += (impulse * normalY) / obj2.mass;
    }
}


