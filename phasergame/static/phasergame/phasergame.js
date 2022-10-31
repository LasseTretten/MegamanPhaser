
var config = {
    type:Phaser.AUTO,
    width: 800,
    height: 480,
    backgroundColor: 0x000000,
    scene: [Scene1],
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: {y : 1200}
        }
    }
}
var game = new Phaser.Game(config);

