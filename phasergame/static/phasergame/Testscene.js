const constants = {
    maxSpeed: 220,
    groundDrag: 1000,
    slideDrag: 600, 
    driftdrag: 200, 
    slideMaxSpeed: 350,
}

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


/**
 * Idle state.
 */
class IdleState extends State {
    enter(scene, player) {
        player.body.setDrag(constants.groundDrag);
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

        if(player.body.onFloor() && this.jump){ 
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

/**
 * Jump state.
 * If the left, right or up key is held down, this state will immediately transition into the drift state. 
 */
class JumpState extends State {
    enter(scene, player){
        player.body.setAccelerationX(0);
        player.body.setDrag(constants.driftDrag);
        player.body.setVelocityY(-220);
    }

    execute(scene, player) {
        if (scene.cursors.left.isDown || scene.cursors.right.isDown || scene.cursors.up.isDown) {
            this.stateMachine.transition('drift');
            return;
        }        

        if (player.body.onFloor()) {
            this.stateMachine.transition('idle');
            return;
        }
    }
}

/**
 * Drift state.
 * Make it possible for the player to "drift" after the player has jumped. 
 * How high the in the air the player jumps depends on how long the 'jump-key' is held down. 
 */
class DriftState extends State {
    enter(scene, player) {
        player.body.setDrag(constants.driftDrag);
        this.loopCounter = 0; 
        this.maxLoops = 15; 
        this.shoot = false;
        
        if(scene.cursors.up.isDown) {
            this.jump = true;
        }
        else {
            this.jump = false; 
        }

        if (scene.cursors.space.isUp) {
            this.shoot = true; 
        }

        player.anims.play('jump', true);
    }


    execute(scene, player) {

        this.loopCounter += 1; 
        player.setAcceleration(0);

        if (scene.cursors.space.isUp) {
            this.shoot = true; 
        }

        if (scene.cursors.space.isDown && this.shoot) {
            player.setTexture('mega', 'jump006');
            this.shootBullet(scene, player);
            this.shoot = false; 
            return; 
        }

        if (player.body.onFloor()) {
            this.stateMachine.transition('idle');
            return;
        }

        if(scene.cursors.up.isUp) {
            this.jump = false; 
        }

        if(this.jump && this.loopCounter <= this.maxLoops) {
            player.body.setVelocityY(-300);
        }
        
        if(scene.cursors.left.isDown && Math.abs(player.body.velocity.x) <= constants.maxSpeed) {
            player.body.setAccelerationX(-150);
            return
        }
        
        if(scene.cursors.right.isDown && Math.abs(player.body.velocity.x) <= constants.maxSpeed) {
            player.body.setAccelerationX(150);
            return; 
        }
    }
}

/**
 * Walk state.
 * Player is running either left or right. 
 */
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
            if(Math.abs(player.body.velocity.x) <= constants.maxSpeed) {
                player.body.setAccelerationX(-600);
            }
        }
        
        if(scene.cursors.right.isDown) {
            player.flipX = false;
            player.anims.play("running", true);
            if(Math.abs(player.body.velocity.x) <= constants.maxSpeed) {
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


/**
 * Slide state
 */
class SlideState extends State{
    enter(scene, player){
        player.setAcceleration(0);
        player.setDrag(250);


        //Adjusting the hit box acording to the animation. 
        this.resizeHitBox(player, 3, -17);
        player.body.setOffset(6);

        if (Math.abs(player.body.velocity.x) < constants.slideMaxSpeed) {
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

    //Resizes the player's body (hitbox). 
    resizeHitBox(player, width, height) {
        player.body.setSize(player.body.width + width, player.body.height + height);
    }
}


/**
 * Teleport state.
 * This state is evoked once the game starts. 
 */
class TeleportState extends State {
    enter(scene, player) {
        player.anims.play('teleport', true);
        player.once('animationcomplete', () => {
        this.stateMachine.transition('idle');
        });
    }
}
 
class Testscene extends Phaser.Scene {
    constructor() {
        super("testgame");
    }
    
    preload() {
        // tilemap spritesheet PNG.
        this.load.image('tiles', '/static/assets/tilemaps/tile001.png');
        // Map with embeded tilemap exported from Tiled.
        this.load.tilemapTiledJSON('megamap', '/static/assets/tilemaps/megamap.json');
        // Megaman spritesheet.
        this.load.atlas('mega', '/static/assets/mega.png', '/static/assets/mega.json');
        // Weapon spritesheet.
        this.load.atlas('weapon', '/static/assets/weapon.png', '/static/assets/weapon.json');
    }

    create() {
        // Creating the map.
        const map = this.make.tilemap({key: 'megamap'});
        const tileset = map.addTilesetImage('tile001', 'tiles');
        const layer = map.createLayer('Tile Layer 1', tileset);

        //Make player sprite.
        this.player = this.physics.add.sprite(config.width/4, 0, 'mega', 'stand001');
        this.player.setOrigin(0, 0);

        // Camera 
        this.cameras.main.setBounds(0, 0, 1600);
        this.cameras.main.startFollow(this.player, 0.7, 0.7);

        // Each tile (16x16 pixels) has a boolean prpperty collision (see megamap.json).
        layer.setCollisionByProperty({collision: true});

        // Debug hit boxes from tilemap.
        
        const debugGraphics = this.add.graphics().setAlpha(0);
        layer.renderDebug(debugGraphics, {
            tileColor: null,
            colidingTilecolors: new Phaser.Display.Color(243, 234, 48, 255),
            faceColor: new Phaser.Display.Color(40, 39, 37, 255)
        })

        // Sprite group for bullets 
        this.bullets = this.physics.add.group();
    
        // Animations
        this.makeAnimations();

        // Cursors
        this.cursors = this.input.keyboard.createCursorKeys();

        // Colliders
        this.physics.add.collider(this.player, layer);

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

        
    /**
     * Removes bullets oudside the screen. 
     */
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
            frames: this.anims.generateFrameNames('mega', {prefix: 'shoot', start: 9, end: 12, zeroPad: 3}),
            repeat: -1, 
            frameRate: 15
        });
    }
       


    update() {
        this.stateMachine.step();
        this.clearBullets();
    }
}
