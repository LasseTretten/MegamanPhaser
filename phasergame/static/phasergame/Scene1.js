var maxSpeedX = 220;
var groundDrag = 1000;
var slideDrag = 600; 
var driftDrag = 200; 
var slideMaxSpeed = 350;

/**
 * Class Representing a finite state machine.
 */
class StateMachine {
    /** Class representing a finite state machine. 
     * @param {state} intialState The Initial state for this machine.
     * @param {object} possibleStates key: stateName, value: a State object. 
     * @param {array} stateArgs List of arguments passed passed to enter and execute methods.
     */
    constructor(initialState, possibleStates, stateArgs) {
        this.initialState = initialState;
        this.possibleStates = possibleStates;
        this.stateArgs = stateArgs;
        this.state = null; 

        //State instances get accsess to the state machine via this.stateMachine.
        for(const state of Object.values(this.possibleStates)) {
            state.stateMachine = this;
        }
    }

    /**
     * This method will be called by the scene's update method (game loop). 
     */
    step() {
        //On the first step, the state is null and we need to initilize the first state.
        if(this.state === null) {
            this.state = this.initialState;
            this.possibleStates[this.state].enter(...this.stateArgs);
        }

        //Run the current state's execute method.
        this.possibleStates[this.state].execute(...this.stateArgs);
    }

    /**
     * Transition state. 
     * @param {state} newState This wil be the new this.state of the current machine.   
     * @param  {...any} enterArgs List of arguments which shall be passed to the newState's enter method.
     */
    transition(newState, ...enterArgs) {
        this.state = newState;
        console.log(this.state);
        this.possibleStates[this.state].enter(...this.stateArgs, ...enterArgs);
    }
}


/**
 * Base class for all states to come. 
 */
class State {

    enter() {
    }

    execute() {
    }


    shootBullet(scene, player){

        if(!scene.hasOwnProperty('bullets')){
            throw 'There are no sprite groups called bullets. You must  make it  inside the scene class.'
        }

        if(player.flipX) {
            scene.bullets.create(player.body.center.x -20, player.body.center.y - 5, 'weapon', 'bullet001');
            let bullet = scene.bullets.getLast(true);
            bullet.setVelocityX(-320);
            bullet.body.setAllowGravity(false);
        }
        
        else if(!player.flipX) {
            scene.bullets.create(player.body.center.x +20, player.body.center.y - 5, 'weapon', 'bullet001');
            let bullet = scene.bullets.getLast(true);
            bullet.setVelocityX(350);
            bullet.body.setAllowGravity(false); 
        }
    }
}

class IdleState extends State {
    enter(scene, player) {
        player.body.setDrag(groundDrag);
        player.anims.stop();
        player.setTexture("mega", 'stand001');
        this.counter = 0; 
        this.jump = false; 
        this.shoot = false; 

        if(scene.cursors.up.isUp) {
            this.jump = true; 
        }
    }

    execute(scene, player) {

        if(scene.cursors.up.isUp) {
            this.jump = true; 
        }

        if(scene.cursors.space.isUp) {
            this.shoot = true; 
        } 
 

        if(scene.cursors.space.isDown && this.shoot) {
            player.anims.play('shoot', true); 
            player.once('animationcomplete', () => this.shootBullet(scene, player));
            this.shoot = false; 
            this.counter = 300;
            return;
        } 

        if(player.body.touching.down && this.jump){ 
            if (scene.cursors.up.isDown) {
                this.stateMachine.transition('jump');
                return;
            }
        }
        
        if(scene.cursors.left.isDown || scene.cursors.right.isDown) {
            this.stateMachine.transition('walk');
            return;
        }

        this.counter += 1; 
        if(this.counter >= 500) {
            player.anims.play("standing", true);
            this.counter = 0; 
        }
    }
}


class JumpState extends State {
    enter(scene, player){
        player.body.setAccelerationX(0);
        player.body.setDrag(driftDrag);
        player.body.setVelocityY(-220);
    }

    execute(scene, player) {
        if (scene.cursors.left.isDown || scene.cursors.right.isDown || scene.cursors.up.isDown) {
            this.stateMachine.transition('drift');
            return;
        }        

        if (player.body.touching.down) {
            this.stateMachine.transition('idle');
            return;
        }
    }
}

class DriftState extends State {
    enter(scene, player) {
        player.body.setDrag(driftDrag);
        this.loopCounter = 0; 
        this.maxLoops = 15; 
        this.shoot = false;
        
        if(scene.cursors.up.isDown) {
            this.jump = true;
        }
        else {
            this.jump = false; 
        }

        this.resizeHitBox(player, 0, 18);

        player.anims.play('jump', true);

        if (scene.cursors.space.isUp) {
            this.shoot = true; 
        }
    }


    execute(scene, player) {

        this.loopCounter += 1; 
        player.setAcceleration(0);

        if (scene.cursors.space.isUp) {
            this.shoot = true; 
        }

        if (scene.cursors.space.isDown && this.shoot) {
            player.setTexture('mega', 'jump008');
            this.shootBullet(scene, player);
            this.shoot = false; 
            return; 
        }

        if (player.body.touching.down) {
            this.resizeHitBox(player, 0, -18);
            player.body.setOffset(0, -1);
            this.stateMachine.transition('idle');
            return;
        }

        if(scene.cursors.up.isUp) {
            this.jump = false; 
        }

        if(this.jump && this.loopCounter <= this.maxLoops) {
            player.body.setVelocityY(-300);
        }
        
        if(scene.cursors.left.isDown && Math.abs(player.body.velocity.x) <= maxSpeedX) {
            player.body.setAccelerationX(-100);
            return
        }
        
        if(scene.cursors.right.isDown && Math.abs(player.body.velocity.x) <= maxSpeedX) {
            player.body.setAccelerationX(100);
            return; 
        }
    }

    resizeHitBox(player, width, height) {
        player.body.setSize(player.body.width + width, player.body.height + height);
    } 
}

class WalkState extends State {
    enter(scene, player){
        this.jump = false;

        if(scene.cursors.up.isUp) {
            this.jump = true;
        }
    }

    execute(scene, player) {
        player.body.setAccelerationX(0);

        if (scene.cursors.left.isDown) {
            player.flipX = true;
            player.anims.play("running", true); 
            if(Math.abs(player.body.velocity.x) <= maxSpeedX) {
                player.body.setAccelerationX(-600);
            }
        }
        
        if(scene.cursors.right.isDown) {
            player.flipX = false;
            player.anims.play("running", true);
            if(Math.abs(player.body.velocity.x) <= maxSpeedX) {
                player.setAccelerationX(600);
            }
        }

        if(scene.cursors.left.isUp && scene.cursors.right.isUp && scene.cursors.up.isUp) {
            this.stateMachine.transition('idle');
            return;
        }
        
        if(scene.cursors.up.isUp) {
            this.jump = true; 
        }

        if(scene.cursors.up.isDown && this.jump) {
            this.stateMachine.transition('jump');
            return;
        }

        if(scene.cursors.down.isDown){
            this.stateMachine.transition('slide');
        }
    }
}


class SlideState extends State{
    enter(scene, player){
        player.setAcceleration(0);
        player.setDrag(250);


        //Adjusting the hit box acording to the animation. 
        this.resizeHitBox(player, 3, -17);
        player.body.setOffset(6);

        if (Math.abs(player.body.velocity.x) < slideMaxSpeed) {
            if(player.body.velocity.x < 0) {
                player.body.velocity.x -= 100;
            }
            else if (player.body.velocity.x > 0) {
                player.body.velocity.x += 100;
            }
        }

        player.anims.play('slide', true); 
    }


    execute(scene, player) {

        if(scene.cursors.up.isDown) {
            this.resizeHitBox(player, -3, 17)
            player.body.setOffset(0);
            player.body.y -= 10;
            this.stateMachine.transition('jump');
            return;
        }

        if(scene.cursors.down.isUp || Math.abs(player.body.velocityX <= 0)){
            this.resizeHitBox(player, -3, 17)
            player.body.setOffset(0);
            player.body.y -= 10;
            this.stateMachine.transition('idle');
            return;
        }
    }

    resizeHitBox(player, width, height, offSett) {
        player.body.setSize(player.body.width + width, player.body.height + height);
    }
}


class TeleportState extends State {
    enter(scene, player) {
        player.anims.play('teleport', true);
        player.once('animationcomplete', () => {
        this.stateMachine.transition('idle');
        });
    }
}

class Scene1 extends Phaser.Scene {
    constructor() {
        super("bootgame");
    }
    
    preload() {
        // Background layers (parallaxing).
        this.load.image('bg1', '/static/assets/bg1.png');
        this.load.image('bg2', '/static/assets/bg2.png');
        this.load.image('bg3', '/static/assets/bg3.png');
        this.load.image('bg4', '/static/assets/bg4.png');
        this.load.image('bg5', '/static/assets/bg5.png');
        this.load.atlas('mega', '/static/assets/mega.png', '/static/assets/mega.json');
        this.load.atlas('weapon', '/static/assets/weapon.png', '/static/assets/weapon.json');

        for (let i = 0; i <= 11; i++) {
            this.load.image('ground' + i, '/static/assets/Ground&Stone/Ground/ground' + i + '.png')
        }
    }

    create() {
        // Sky and moon.
         this.bg1 = this.addImage(0, 0, 'bg1', 0, [config.width, config.height - 100]);
        // Distant mountains. 
        this.bg2 = this.addTileSprite(0, 110, config.width, config.height, 'bg2', 0.10, [config.width, 800]);
        // Mointains.
        this.bg3 = this.addTileSprite(0, 110, config.width, 160, 'bg3', 0.15, [config.width, 280]);
        //Distant forrest
        this.bg4 = this.addTileSprite(0, 140, config.width, 160, 'bg4', 0.35, [config.width, 280]);
        //Nearby trees
        this.bg5 = this.addTileSprite(0, 120, config.width, 160, 'bg5', 0.5, [config.width, 300]);

        // Array with all bacground layers.         
        this.backgrounds = [this.bg2, this.bg3, this.bg4, this.bg5]; 

        //Make Ground tiles.
        this.ground = this.physics.add.staticGroup();
        this.makeGround(100, this.ground);


        //Make player sprite.
        this.player = this.physics.add.sprite(config.width/2, 0, 'mega', 'stand001');
        this.player.setOrigin(0, 0);
        //this.player.setCollideWorldBounds(true);
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setLerp(0.5, 0);


        // Sprite group for bullets 
        this.bullets = this.physics.add.group();
    
        // Animations
        this.makeAnimations();

        // Cursors
        this.cursors = this.input.keyboard.createCursorKeys();

        // Colliders.
        this.physics.add.collider(this.player, this.ground);

        //Statemachine
        this.stateMachine = new StateMachine('teleport', {
            idle: new IdleState,
            walk: new WalkState,
            jump: new JumpState,
            drift: new DriftState,
            teleport: new TeleportState,
            slide: new SlideState,
        }, [this, this.player]);


        
    }

    addTileSprite(x, y, width, height, asset, ratioX, displaySize = false) {
        let tileSprite = this.add.tileSprite(x, y, width, height, asset);
        tileSprite.ratioX = ratioX;
        tileSprite.setOrigin(0 ,0);
        tileSprite.setScrollFactor(0, 0);

        if(displaySize) {
            tileSprite.setDisplaySize(displaySize[0], displaySize[1]);
        }

        return tileSprite; 
    }

    addImage(x, y, asset, ratioX, displaySize = false) {
        let image = this.add.image(x, y, asset);
        image.ratioX = ratioX; 
        image.setOrigin(0, 0);
        image.setScrollFactor(0, 0);
        if(displaySize) {
            image.setDisplaySize(displaySize[0], displaySize[1]);
        }

        return image;
    }

    parallax() {
        for (const bg of this.backgrounds) {
            bg.tilePositionX = this.cameras.main.scrollX*bg.ratioX;
        }
    }

    makeGround(number, group) {
        for(let i = 0; i < number; i++) {
            let num = (i % 3) + 1;  
            group.create(i*44, 218, 'ground' + num).setScale(0.352).refreshBody();
        }
    }


    clearBullets() {
        for (const bullet of this.bullets.getChildren()) {
            if(Math.abs(bullet.body.x - this.player.body.x) > config.width/2){
                bullet.destroy();
            }
        }
    }

    /**
     * Creates all animations.
     */
    makeAnimations() {
        this.anims.create({
            key: 'running',
            frames: this.anims.generateFrameNames('mega', {prefix: 'run', start: 1, end: 12, zeroPad: 3}),
            repeat: 0,
            frameRate: 20
        });

        this.anims.create({
            key: 'standing',
            frames: this.anims.generateFrameNames('mega', {prefix: 'stand', start: 1, end: 8, zeroPad: 3}),
            repeat: 0, 
            frameRate: 8,
        });

        this.anims.create({
            key: 'teleport',
            frames: this.anims.generateFrameNames('mega', {prefix: 'tel', start:1, end: 13, zeroPad: 3}),
            repeat: 0,
            frameRate: 12,
        });

        this.anims.create({
            key: 'jump',
            frames: this.anims.generateFrameNames('mega', {prefix: 'jump', start: 1, end: 4, zeroPad:3}),
            repeat: 0,
            frameRate: 12,

        });

        this.anims.create({
            key: 'slide',
            frames: this.anims.generateFrameNames('mega', {prefix: 'slide', start: 1, end: 3, zeroPad: 3}),
            repeat: 0, 
            frameRate: 8,
        });

        this.anims.create({
            key: 'shoot',
            frames: this.anims.generateFrameNames('mega', {prefix: 'shoot', start: 1, end: 3, zeroPad: 3}),
            repeat: 0, 
            frameRate: 40
        });

        this.anims.create({
            key: 'rshoot', 
            frames: this.anims.generateFrameNames('mega', {prefix: 'shoot', start: 3, end: 3, zeropad: 3}),
            repeat: 0, 
            frameRate: 20
        });
    }   


 

update() {
        this.stateMachine.step();
        this.parallax();
        this.clearBullets();
    }
}