/*global Phaser*/

var game = new Phaser.Game(800, 680, Phaser.AUTO, 'TutContainer', { preload: preload, create: create});

//horizontal tile shaped level
var levelData=
[[-1,-1,-1,10,10,10,10,10,10,10,-1,-1,-1],
[-1,-1,10,0,0,0,0,0,0,10,-1,-1,-1],
[-1,-1,10,0,0,0,0,0,0,0,10,-1,-1],
[-1,10,0,0,10,0,0,0,0,0,10,-1,-1],
[-1,10,10,0,10,0,0,10,0,0,0,10,-1],
[10,0,0,0,0,0,0,0,0,0,0,10,-1],
[10,0,0,10,0,0,10,0,0,10,0,0,10],
[10,0,0,10,0,0,0,0,0,0,10,10,-1],
[-1,10,0,0,0,10,10,10,0,0,0,10,-1],
[-1,10,0,0,0,0,0,0,0,0,10,-1,-1],
[-1,-1,10,0,0,0,0,0,0,0,10,-1,-1],
[-1,-1,10,0,0,0,0,0,0,10,-1,-1,-1],
[-1,-1,-1,10,10,10,10,10,10,10,-1,-1,-1]];

var bmpText;
var hexTileHeight=61;
var hexTileWidth=52;
var hexGrid;
var infoTxt;
var rootThree;
var sideLength;

function preload() {
    //load all necessary assets
    game.load.bitmapFont('font', 'assets/font.png', 'assets/font.xml');
    game.load.image('hex', 'assets/hexsmall.png');
}

function create() {
    rootThree=Math.sqrt(3);
    sideLength=hexTileHeight/2;
    bmpText = game.add.bitmapText(10, 10, 'font', 'Cubic\nTap to find tile', 18);
    game.stage.backgroundColor = '#cccccc';
    createLevel();
    infoTxt=game.add.text(10,50,'0,0');
    
    //game.input.onHold.add(onHold);//hold to clear path
    //game.input.holdRate=500;
    // Maintain aspect ratio
    game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    
    game.input.onTap.add(onTap);//tap to find tile
}

function createLevel(){
    hexGrid=game.add.group();
   
    var tileX;
    var tileY;
    var hexTile;
    var axialPoint=new Phaser.Point();
    var screenPoint=new Phaser.Point();
    for (var i = 0; i < levelData.length; i++)
    {
        for (var j = 0; j < levelData[0].length; j++)
        {
            axialPoint.x=i;
            axialPoint.y=j;
            axialPoint=offsetToAxial(axialPoint);
            screenPoint=axialToScreen(axialPoint);
            
            if(levelData[i][j]!=-1){
                hexTile= new HexTileNode(game, screenPoint.x, screenPoint.y, 'hex', false,i,j,levelData[i][j]);
                hexGrid.add(hexTile);
                //console.log(screenPoint.x+':'+ screenPoint.y);
            }
        }
        
    }
    hexGrid.x=hexTileWidth/2;
    hexGrid.y=sideLength;
}
function onTap(){
    var tile= findCubicHexTile();
    infoTxt.text='tap '+tile.x+':'+tile.y;
    //convert to offset
    tile=axialToOffset(tile);
    if(!checkforBoundary(tile.x,tile.y)){
        if(!checkForOccuppancy(tile.x,tile.y)){
            var hexTile=hexGrid.getByName("tile"+tile.x+"_"+tile.y);
            hexTile.showAxial();
        }
    }
}

function findCubicHexTile(){
    var pos=game.input.activePointer.position;
    pos.x-=hexGrid.x;
    pos.y-=hexGrid.y;
    //console.log(pos.x+':'+ pos.y);
    return screenToAxial(pos);
}
function screenToAxial(screenPoint){
    var axialPoint=new Phaser.Point();
    axialPoint.x=screenPoint.y/(1.5*sideLength);
    axialPoint.y=(screenPoint.x-(screenPoint.y/rootThree))/(rootThree*sideLength);
    var cubicZ=calculateCubicZ(axialPoint);
    var round_x=Math.round(axialPoint.x);
    var round_y=Math.round(axialPoint.y);
    var round_z=Math.round(cubicZ);
    if(round_x+round_y+round_z==0){
        screenPoint.x=round_x;
        screenPoint.y=round_y;
    }else{
        var delta_x=Math.abs(axialPoint.x-round_x);
        var delta_y=Math.abs(axialPoint.y-round_y);
        var delta_z=Math.abs(cubicZ-round_z);
        if(delta_x>delta_y && delta_x>delta_z){
            screenPoint.x=-round_y-round_z;
            screenPoint.y=round_y;
        }else if(delta_y>delta_x && delta_y>delta_z){
            screenPoint.x=round_x;
            screenPoint.y=-round_x-round_z;
        }else if(delta_z>delta_x && delta_z>delta_y){
            screenPoint.x=round_x
            screenPoint.y=round_y;
        }
    }
    return screenPoint;
}
function axialToScreen(axialPoint){
    var tileX=rootThree*sideLength*(axialPoint.y+(axialPoint.x/2));
    var tileY=3*sideLength/2*axialPoint.x;
    axialPoint.x=tileX;
    axialPoint.y=tileY;
    return axialPoint;
}
function offsetToAxial(offsetPoint){
    offsetPoint.y=(offsetPoint.y-(Math.floor(offsetPoint.x/2)));
    return offsetPoint;
}
function axialToOffset(axialPt){
    axialPt.y=(axialPt.y+(Math.floor(axialPt.x/2)));
    return axialPt;
}
function calculateCubicZ(newAxialPoint){
    return -newAxialPoint.x-newAxialPoint.y;
}

function checkForOccuppancy(i,j){//check if the tile is outside effective area or has a mine
    var tileType=levelData[i][j];
    if(tileType==-1 || tileType==10){
        return true;
    }
    return false;
}
function checkforBoundary(i,j){//check if the tile is outside level data array
    if(i<0 || j<0 || i >levelData.length-1 || j>levelData[0].length-1){
        return true;
    }
    return false;
}