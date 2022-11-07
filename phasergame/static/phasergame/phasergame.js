
var config = {
    type:Phaser.AUTO,
    width: 960, 
    height:  540,
    scale: {
        parent: 'megaman', 
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,

        min: {
            width: 640,
            height: 480
        },

        max: {
            width: 1600,
            height: 900
        }

    },
    backgroundColor: 0x000000,
    scene: [Testscene],

    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: {y : 1200}
        }
    }
}


var game = new Phaser.Game(config);

