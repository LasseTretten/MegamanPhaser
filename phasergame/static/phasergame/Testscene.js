const constants = {
    maxSpeed: 220,
    groundDrag: 1000,
    slideDrag: 600, 
    driftdrag: 200, 
    slideMaxSpeed: 300,
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

        if(!scene.hasOwnProperty('allBullets')){
            throw 'There are no sprite groups called allBullets. You must  make it  inside the scene class.'
        }

        if(!scene.hasOwnProperty('playerBullets')) {
            throw 'There are no sprite groups called playersBullets. You must make it inside the scene class.'
        }

        if(player.flipX) {
            scene.allBullets.create(player.body.center.x -20, player.body.center.y - 5, 'weapon', 'bullet001');
            let bullet = scene.allBullets.getLast(true);
            scene.playerBullets.add(bullet);
            bullet.setVelocityX(-350);
            bullet.body.setAllowGravity(false);
        }
        else if(!player.flipX) {
            scene.allBullets.create(player.body.center.x +20, player.body.center.y - 5, 'weapon', 'bullet001');
            let bullet = scene.allBullets.getLast(true);
            scene.playerBullets.add(bullet);
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
        player.body.setSize(37, 40);

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

        if(this.jump){ 
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
            player.anims.play('standing', true); 
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
            this.jump = false; 
            return;
        }


        if(scene.cursors.up.isDown && this.loopCounter <= this.maxLoops) {
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
 * 
 */
class WalkState extends State {
    enter(scene, player){
        this.jump = false;
        this.shoot = false; 

        if(scene.cursors.up.isUp) {
            this.jump = true;
        }

        if(scene.cursors.space.isUp) {
            this.shoot = true; 
        }
    }


    execute(scene, player) {
        player.body.setAccelerationX(0);
        player.anims.play("running", true);

        
        if(scene.cursors.up.isUp) {
            this.jump = true;
        }

        if(scene.cursors.space.isUp) {
            this.shoot = true; 
        }

        if (scene.cursors.left.isDown) {
            player.flipX = true;
            
            if(Math.abs(player.body.velocity.x) <= constants.maxSpeed) {
                player.body.setAccelerationX(-600);
            }

            if(this.shoot && scene.cursors.space.isDown) {
                this.stateMachine.transition('walkShoot');
                return
            }
        }
        
        if(scene.cursors.right.isDown) {
            player.flipX = false;
            
            if(Math.abs(player.body.velocity.x) <= constants.maxSpeed) {
                player.setAccelerationX(600);
            }

            if(this.shoot && scene.cursors.space.isDown) {
                this.stateMachine.transition('walkShoot');
                return
            }
        }

        if(scene.cursors.left.isUp && scene.cursors.right.isUp && scene.cursors.up.isUp) {
            this.stateMachine.transition('idle');
            return;
        }
        
        if(scene.cursors.up.isDown && this.jump) {
            this.stateMachine.transition('jump');
            return
        }

        if(scene.cursors.down.isDown){
            this.stateMachine.transition('slide');
            return;
        }
    }
}


class WalkShootState extends State {
    enter(scene, player) {
        player.body.setAcceleration(0);
        player.setDrag(constants.groundDrag);
        player.anims.play('rshoot', true);
    }

    execute(scene, player) {
        player.setAccelerationX(0);
        if(scene.cursors.left.isDown && player.flipX){
            player.anims.play('rshoot', true); 

            if(Math.abs(player.body.velocity.x) <= constants.maxSpeed) {
                player.setAccelerationX(-600);
            }

            if(player.anims.getFrameName() == "shoot007") {
                this.shootBullet(scene, player);
                this.stateMachine.transition('idle');
                return;
            }
        }
        else if(scene.cursors.left.isDown && player.flipX == false) {
            player.anims.stop();
            this.stateMachine.transition('walk');
        }

        if(scene.cursors.right.isDown && player.flipX == false) {
            player.anims.play('rshoot', true);

            if(Math.abs(player.body.velocity.x) <= constants.maxSpeed) {
                player.body.setAccelerationX(600);
            }

            if(player.anims.getFrameName() == "shoot007") {
                this.shootBullet(scene, player);
                this.stateMachine.transition('idle');
                return;
            }
            else if(scene.cursors.right.isDown && this.flipX) {
                this.stateMachine.transition('walk'); 
                return; 
            }
        }

        if(!(scene.cursors.right.isDown || scene.cursors.left.isDown)) {
            this.stateMachine.transition('idle');
            return;
        }
    }

}

/**
 * Slide state
 *
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


 class ShotOnGroundState extends State {
    enter(scene, player) {
        player.body.setVelocityX(0);
        player.reduceHealth();
        player.anims.play('groundDam', true);
        player.once('animationcomplete', () => this.stateMachine.transition('idle'));
    }

    execute(scene, player) {
        player.body.setVelocityX(0);
    }
 }

 class ShotSlideingState extends State {
    enter(scene, player) {
        player.reduceHealth();
        player.anims.play('slideDam', true);
        player.once('animationcomplete', () => {
            player.body.setSize(40, 23);
            player.stateMachine.transition('idle');
        }); 
    }

    execute(scene, player) {
        if(player.anims.getFrameName() == 'dam010') {
            player.body.setSize(42, 27);
            player.body.setOffset(0, 2);
            player.body.y -= 2; 
        }
    }
 }

 class ShotInAirState extends State {
    enter(scene, player) {
        player.reduceHealth(); 
        player.anims.play('airDam', true);
        player.once('animationcomplete', () => {
            player.stateMachine.transition('drift'); 
        });
    }
 }

 class HitOngroundState extends State {
    enter(scene, player) {
        player.reduceHealth();
        
    }
 }

class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture = 'mega', frame =  'stand001') {
        super(scene, x, y, texture, frame);
        this.healthBar = new HealthBar(scene, 55, 10);
        scene.add.existing(this);
        scene.physics.world.enableBody(this);
        this.setOrigin(0, 0);
        this.health = this.healthBar.health;
        this.alive = true; 
        this.body.setMaxVelocityX(constants.slideMaxSpeed);
    }

    reduceHealth(amount = 1) {
        if(this.hurt) {
            return
        }

        if(this.health - amount <= 0) {
            this.alive = false; 
            this.health = 0; 
            return;
        }
        else if(this.health - amount > this.healthBar.maxHealth) {
            this.health = this.healthBar.maxHealth;
            this.healthBar.setHealth(this.healthBar.maxHealth); 
            return;
        }

        this.healthBar.reduce(amount);
        
        this.health = this.healthBar.health; 
    }
}

class HealthBar extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture = 'healthBar', frame =  'hbar15') {
        super(scene, x, y, texture, frame);
        scene.add.existing(this);
        this.setScale(0.27);
        scene.physics.world.enableBody(this);
        this.body.setAllowGravity(false);
        this.setScrollFactor(0);

        this.maxHealth = 15; 
        this.health = this.maxHealth; 
    }

    reduce(amount) {
        if(this.health - amount > this.maxHealth) {
            this.health = this.maxHealth;
            this.setTexture('healthBar', 'hbar15')
            return;
        }
        else if(this.health - amount < 0) {
            this.health = 0; 
            this.setTexture('healthBar', 'hbar0'); 
            return; 
        }
        
        this.health -= amount; 
        this.setTexture('healthBar', 'hbar' + this.health); 
    }

    setHealth(amount) {
        if(1<= amount <= this.maxHealth) {
            this.health = amount; 
            this.setTexture('healthBar', 'hbar' + amount); 
        }
        else {
            throw 'amount must be an integer between 1 and' + this.maxHealth + 'inclusive';
        }
    }
}


class Lobber extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture = 'lobber', frame = 'lobber001') {
        super(scene, x, y, texture, frame); 
        scene.physics.world.enableBody(this); 

        this.scene = scene; 
        this.shoot = true; 
        this.x0 = x - 150; 
        this.x1 = x + 150; 
        scene.add.existing(this);
    }

    update() {
        if(this.body.x <= this.x0) {
            this.flipX = true;
            this.body.setVelocityX(80);
            this.anims.play('lob', true); 
        }
        else if(this.body.x >= this.x1) {
            this.flipX = false;
            this.body.setVelocityX(-80);
            this.anims.play('lob', true); 
        }

        if(this.anims.getFrameName() == 'lobber002') {
            this.body.setOffset(0, 2);
            this.shoot = true; 
        }
        else if(this.anims.getFrameName() == 'lobber005') {
            this.body.setSize(32, 26);
        }
        else if(this.anims.getFrameName() == 'lobber006') {
            this.body.setSize(32, 30);
            this.body.setOffset(0, 3);
            if(this.shoot) {
                this.shootBullet(this.scene, this.sprite);
                this.shoot = false; 
            }
        }
        else {

            this.body.setSize(32, 17);
        }
    }

    shootBullet() {
        if(this.flipX) {
            this.scene.allBullets.create(this.body.x + 10, this.body.center.y - 9, 'weapon', 'bullet001');
            let bullet = this.scene.allBullets.getLast(true);
            this.scene.enemyBullets.add(bullet);
            bullet.setVelocityX(350); 
            bullet.body.setAllowGravity(false);
        }
        else if(!this.flipX.x) {
            this.scene.allBullets.create(this.body.x - 10, this.body.center.y - 9, 'weapon', 'bullet001');
            let bullet = this.scene.allBullets.getLast(true);
            this.scene.enemyBullets.add(bullet);
            bullet.setVelocityX(-350); 
            bullet.body.setAllowGravity(false);
        }
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
        // Lobber enemy spritesheet.
        this.load.atlas('lobber', '/static/assets/lobber.png', '/static/assets/lobber.json');
        // Health bar.
        this.load.atlas('healthBar', '/static/assets/healthBar.png', '/static/assets/healthBar.json');
    }

    create() {

        // Cursors
        this.cursors = this.input.keyboard.createCursorKeys();       

        // Creating the map.
        const map = this.make.tilemap({key: 'megamap'});
        const tileset = map.addTilesetImage('tile001', 'tiles');
        const layer = map.createLayer('Tile Layer 1', tileset);

        // Create groups. 
        this.createGroups();

        // Create the player sprite.
        this.player = new Player(this, 100, 100);

        //Statemachine
        this.player.stateMachine = new StateMachine('teleport', {
            idle: new IdleState,
            walk: new WalkState,
            jump: new JumpState,
            drift: new DriftState,
            teleport: new TeleportState,
            slide: new SlideState,
            walkShoot: new WalkShootState,
            groundDam: new ShotOnGroundState,
            slideDam: new ShotSlideingState,
            airDam: new ShotInAirState
        }, [this, this.player]);

        // Lobber 
        this.addLobber(400, 100);

        
        // Colliders
        this.physics.add.collider(this.player, layer);
        this.physics.add.collider(this.allEnemies, layer);


        this.physics.add.collider(this.allBullets, layer, function(bullet){
            bullet.destroy();
        });

        this.physics.add.collider(this.player, this.enemyBullets, function(player, bullet){
            bullet.destroy();
            let damOnGround = ['idle', 'walk', 'walkShoot'];
            let damInAir = ['jump', 'drift']; 

            if(damOnGround.includes(player.stateMachine.state)) {
                player.stateMachine.transition('groundDam');
            }
            else if(player.stateMachine.state === 'slide') {
                player.stateMachine.transition('slideDam');
            }
            else if(damInAir.includes(player.stateMachine.state)) {
                player.stateMachine.transition('airDam');
            }
        });

        this.physics.add.overlap(this.player, this.allEnemies, function(player, enemy) {
            let damOnGround = ['idle', 'walk', 'walkshooot']; 
            let damInAir = ['jump', 'drift'];

            if(damOnGround.includes(player.stateMachine.state)) {
                player.body.stop();
                player.stateMachine.transition('groundDam');
            }
            else if(player.stateMachine.state === 'slide') {
                player.body.stop();
                player.stateMachine.transition('airDam');
            }
            else if(damInAir.includes(player.stateMachine.state)) {
                player.body.stop();
                player.stateMachine.transition('airDam');
            }
        });


        // Camera 
        this.cameras.main.setBounds(0, 0, 1600, 540);
        this.cameras.main.startFollow(this.player, 0.7, 0.7, 0, 0);

        // Each tile (16x16 pixels) has a boolean prpperty collision (see megamap.json).
        layer.setCollisionByProperty({collision: true});

        // Debug hit boxes from tilemap.
        const debugGraphics = this.add.graphics().setAlpha(0);
        layer.renderDebug(debugGraphics, {
            tileColor: null,
            colidingTilecolors: new Phaser.Display.Color(243, 234, 48, 255),
            faceColor: new Phaser.Display.Color(40, 39, 37, 255)
        })

        // Animations
        this.makeAnimations(); 
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
            frames: this.anims.generateFrameNames('mega', {prefix: 'shoot', start: 4, end: 7, zeroPad: 3}),
            repeat: 0, 
            frameRate: 18
        });

        this.anims.create({
            key: 'charge',
            frames: this.anims.generateFrameNames('mega', {prefix: 'charge', start: 8, end: 10, zeroPad: 3}),
            repeat: 0, 
            frameRate: 12
        });

        this.anims.create({
            key: 'lob',
            frames: this.anims.generateFrameNames('lobber', {prefix: 'lobber', start: 1, end: 7, zeroPad: 3}),
            repeat: 0,
            frameRate: 8
        });

        this.anims.create({
            key: 'groundDam',
            frames: this.anims.generateFrameNames('mega', {prefix: 'dam', start: 1, end: 5, zeroPad: 3}),
            repeat: 0,
            frameRate: 10
        });

        this.anims.create({
            key: 'slideDam',
            frames: this.anims.generateFrameNames('mega', {prefix: 'dam', start: 6, end: 10, zeroPad: 3}),
            repeat: 0,
            frameRate: 10
        });

        this.anims.create({
            key: 'airDam',
            frames: this.anims.generateFrameNames('mega', {prefix: 'dam', start: 11, end: 14, zeroPad: 3}),
            repeat: 0,
            framRate: 10
        });
    }

    /**
     * Removes bullets oudside the screen. 
     */
     clearBullets() {
        for (const bullet of this.allBullets.getChildren()) {
            if(Math.abs(bullet.body.x - this.player.body.x) > config.width){
                bullet.destroy();
            }
        }
    }
    
    createGroups() {
        // Bullets
         this.allBullets = this.physics.add.group();
         this.playerBullets = this.physics.add.group();
         this.enemyBullets = this.physics.add.group();
        
        // Enemies
         this.allEnemies = this.physics.add.group(); 
         this.allEnemies.runChildUpdate= true; 

         this.lobbers = this.physics.add.group();  

         // Array containing all sprite groups.
         this.allGroups = [this.allBullets, this.playerBullets, this.enemyBullets, this.allEnemies, this.lobbers]; 
    }

    addLobber(x, y) {
        let lobber = new Lobber(this, x, y);
        this.allEnemies.add(lobber);
        this.lobbers.add(lobber);
        // There seems to be a bug in phaser ? 
        // If you rather set the velocity inside the constructor of an Arcade.Sprite 
        // it seems to reset to zero when we call the update method inside the Arcade.Sprte Class.
        // This only happens if we add the sprite to a group, otherwise it seems to work. 
        // Is there a conflict with the two methods Group.setVelosity and Sprite.setVelocity ? 
        this.lobbers.setVelocityX(-80);       
    }

 
    update() {
        this.player.stateMachine.step();
        this.clearBullets()
    };
}
 