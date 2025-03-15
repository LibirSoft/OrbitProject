const objects = [];
let mouseIsDown = false;
let idTimeout;
let lastMass = 0;
let position = {x: 0, y: 0};
let canMove = true;
let creation = null;
let createCount = 0;

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
            console.log(creation);
            
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


const createObject = (posX, posY, mass, canMove, ghost) => {
    return {
        id: createCount++,
        x: posX,
        y: posY,
        mass: mass,
        canMove: canMove,
        color: getRandomColor(),
        velocityX: 0,
        velocityY: 2,
        ghost,
        collisionHistory: {}
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

        const {dx,dy,distance} = calculateDistance(obj,other);

        const force = G * (obj.mass * other.mass) / (distance * distance);

        forceX += force * (dx / distance);
        forceY += force * (dy / distance);
    }

    const accelerationX = forceX / obj.mass;
    const accelerationY = forceY / obj.mass;

    obj.velocityX = (obj.velocityX + accelerationX) * dampening;
    obj.velocityY = (obj.velocityY + accelerationY) * dampening;

    const tempX = obj.x + obj.velocityX;
    const tempY = obj.y + obj.velocityY;


    for (const other of objects) {
        if (other === obj) continue;
        if (other.ghost) continue;

        const minDistance = (obj.mass + other.mass) / 100;

        const {distance} = calculateDistance({x:tempX,y:tempY},other);

        if (distance <= minDistance) {
            handleCollision(obj, other);
            return;
        }
    }

    obj.x = tempX;
    obj.y = tempY;

    // const radius = obj.mass / 100;
    // if (obj.x < radius) {
    //     obj.x = radius;
    //     obj.velocityX *= -0.5;
    // }
    // if (obj.x > window.innerWidth - radius) {
    //     obj.x = window.innerWidth - radius;
    //     obj.velocityX *= -0.5;
    // }
    // if (obj.y < radius) {
    //     obj.y = radius;
    //     obj.velocityY *= -0.5;
    // }
    // if (obj.y > window.innerHeight - radius) {
    //     obj.y = window.innerHeight - radius;
    //     obj.velocityY *= -0.5;
    // }
}

const mergeBodies = (targetObj, otherObj) => {
    const r1 = targetObj.mass / 100;
    const r2 = otherObj.mass / 100;
    
    // Yeni radius'u alan toplamının karekökü olarak hesapla
    const newRadius = Math.sqrt(r1 * r1 + r2 * r2);
    
    // Yeni mass'ı radius'tan hesapla
    targetObj.mass = newRadius * 100;
    
    // Momentum koruması (eğer hedef obje hareket edebiliyorsa)
    if (targetObj.canMove) {
        const totalMass = targetObj.mass;
        const oldMass = r1 * 100;
        const addedMass = r2 * 100;
        
        targetObj.velocityX = (targetObj.velocityX * oldMass + 
                             otherObj.velocityX * addedMass) / totalMass;
        targetObj.velocityY = (targetObj.velocityY * oldMass + 
                             otherObj.velocityY * addedMass) / totalMass;
    }
    
    // Diğer objeyi diziden kaldır
    const index = objects.indexOf(otherObj);
    if (index > -1) {
        objects.splice(index, 1);
    }
}

const handleCollision = (obj1, obj2) => {
    if (!obj1.canMove && !obj2.canMove) return;

    const currentTime = Date.now();
    const collisionKey = `${Math.min(obj1.id, obj2.id)}-${Math.max(obj1.id, obj2.id)}`;
    
    if (!obj1.collisionHistory[collisionKey]) {
        obj1.collisionHistory[collisionKey] = [];
    }
    if (!obj2.collisionHistory[collisionKey]) {
        obj2.collisionHistory[collisionKey] = [];
    }
    
    const oneSecondAgo = currentTime - 1000;
    obj1.collisionHistory[collisionKey] = obj1.collisionHistory[collisionKey]
        .filter(time => time > oneSecondAgo);
    obj2.collisionHistory[collisionKey] = obj2.collisionHistory[collisionKey]
        .filter(time => time > oneSecondAgo);
    
    obj1.collisionHistory[collisionKey].push(currentTime);
    obj2.collisionHistory[collisionKey].push(currentTime);
    
    if (obj1.collisionHistory[collisionKey].length > 5) {
        const targetObj = !obj1.canMove ? obj1 :
                         !obj2.canMove ? obj2 : 
                         (obj1.mass > obj2.mass ? obj1 : obj2);
        const otherObj = targetObj === obj1 ? obj2 : obj1;
        
        delete targetObj.collisionHistory[collisionKey];
        mergeBodies(targetObj, otherObj);
        return;
    }
    
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
        
        mergeBodies(targetObj, otherObj);
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

const calculateDistance = (obj1, obj2) => {
    const dx = obj2.x - obj1.x;
    const dy = obj2.y - obj1.y;
    return {
        dx,
        dy,
        distance: Math.sqrt(dx * dx + dy * dy)
    };
}

