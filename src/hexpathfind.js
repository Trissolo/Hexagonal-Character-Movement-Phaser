/*global Phaser*/
/* hexagonal A* pathfinding following http://www.policyalmanac.org/games/aStarTutorial.htm */

var game = new Phaser.Game(800, 680, Phaser.AUTO, 'TutContainer', { preload: preload, create: create});

//horizontal tile shaped level
var levelData=
[[-1,-1,-1,0,0,0,0,0,0,0,-1,-1,-1],
[-1,-1,0,0,0,0,0,0,0,0,-1,-1,-1],
[-1,-1,0,0,0,0,0,0,0,0,0,-1,-1],
[-1,0,0,0,10,0,0,0,0,0,0,-1,-1],
[-1,0,10,0,10,0,0,10,0,0,0,0,-1],
[0,0,0,0,0,0,0,0,0,0,0,0,-1],
[0,0,0,10,0,0,5,0,0,10,0,0,0],
[0,0,0,10,0,0,0,0,0,0,10,0,-1],
[-1,0,0,0,0,10,10,10,0,0,0,0,-1],
[-1,0,0,0,0,0,0,0,0,0,0,-1,-1],
[-1,-1,0,0,0,0,0,0,0,0,0,-1,-1],
[-1,-1,0,0,0,0,0,0,0,0,-1,-1,-1],
[-1,-1,-1,0,0,0,0,0,0,0,-1,-1,-1]];

var bmpText;
var hexTileHeight=52;
var hexTileWidth=61;
var hexGrid;
var infoTxt;
var prevTile= new Phaser.Point();
var endTile;
var startTile= new Phaser.Point();
var nextTileToCall;
var showingPath;

function preload() {
    //load all necessary assets
    game.load.bitmapFont('font', 'assets/font.png', 'assets/font.xml');
    game.load.image('hex', 'assets/hexsmall.png');
}

function create() {
    bmpText = game.add.bitmapText(10, 10, 'font', 'Hex Path Find\nTap on empty tile\nTap Hold to clear', 18);
    game.stage.backgroundColor = '#cccccc';
    levelData=transpose(levelData);//transpose for having the right shape
    createLevel();
    //infoTxt=game.add.text(10,30,'hi');
    
    game.input.onHold.add(onHold);//hold to clear path
    game.input.holdRate=500;
    // Maintain aspect ratio
    game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    
    //game.input.addMoveCallback(recentreHexGrid, this);//shows heuristics wrt tile under mouse
    game.input.onTap.add(onTap);//tap to find path
}

function createLevel(){
    hexGrid=game.add.group();
   
    var verticalOffset=hexTileHeight;
    var horizontalOffset=hexTileWidth*3/4;
    var startX;
    var startY;
    var startXInit=hexTileWidth/2;
    var startYInit=hexTileHeight/2;
    
    var hexTile;
    for (var i = 0; i < levelData.length; i++)
    {
        startX=startXInit;
        startY=2*startYInit+(i*verticalOffset);
        for (var j = 0; j < levelData[0].length; j++)
        {
            if(j%2!=0){
                startY=startY+startYInit;
            }else{
                startY=startY-startYInit;
            }
            if(levelData[i][j]!=-1){
                hexTile= new HexTileNode(game, startX, startY, 'hex', true,i,j,levelData[i][j]);
                hexGrid.add(hexTile);
                if(levelData[i][j]==5){
                    startTile.x=i;
                    startTile.y=j;
                }
            }
            startX+=horizontalOffset;
        }
        
    }
    //hexGrid.scale=new Phaser.Point(0.4,0.4);
    hexGrid.x=50;
    hexGrid.y=0;
}
function onTap(){
    if(showingPath)return;
    var tile= findHexTile();
    if(Phaser.Point.equals(tile,startTile))return;
    if(!checkforBoundary(tile.x,tile.y)){
        if(!checkForOccuppancy(tile.x,tile.y)){
            var hexTile=hexGrid.getByName("tile"+tile.x+"_"+tile.y);
            if(hexTile.toggleMark()){
                endTile=hexTile;//set end tile
                console.log('end '+endTile.originali+':'+endTile.originalj);
                hexTile=hexGrid.getByName("tile"+startTile.x+"_"+startTile.y);
                findPath(hexTile);//pass start tile
                showingPath=true;
            }
        }
    }
}
function recentreHexGrid(){
    var tile= findHexTile();
    if(Phaser.Point.equals(tile,prevTile))return;
    prevTile=tile.clone();
    var hexTile;
    if(!checkforBoundary(tile.x,tile.y)){
        if(!checkForOccuppancy(tile.x,tile.y)){
            for (var i = 0; i < levelData.length; i++)
            for (var j = 0; j < levelData[0].length; j++)
            {
                if(levelData[i][j]!=-1){
                hexTile=hexGrid.getByName("tile"+i+"_"+j);
                hexTile.getHeuristic(tile.x,tile.y);
                hexTile.showDifference();
                }
            }
        }
        
    }
}

function findHexTile(){
    var pos=game.input.activePointer.position;
    pos.x-=hexGrid.x;
    pos.y-=hexGrid.y;
    var xVal = Math.floor((pos.x)/(hexTileWidth*3/4));
    var yVal = Math.floor((pos.y)/(hexTileHeight));
    var dX = (pos.x)%(hexTileWidth*3/4);
    var dY = (pos.y)%(hexTileHeight); 
    var slope = (hexTileHeight/2)/(hexTileWidth/4);
    var caldX=dY/slope;
    var delta=hexTileWidth/4-caldX;
    if(xVal%2==0){
        if(dX>Math.abs(delta)){// even left
            
        }else{//odd right
            if(delta>0){//odd right bottom
                xVal--;
                yVal--;
            }else{//odd right top
                xVal--;
            }
        }
    }else{
        if(delta>0){
            if(dX<caldX){//even right top
                xVal--;
            }else{//odd mid
               yVal--; 
            }
        }else{//current values wont help for even right bottom
           if(dX<((hexTileWidth/2)-caldX)){//even right bottom
              //console.log(dY+':'+dX+':'+((hexTileWidth/2)-caldX));
                xVal--;
           }
        }
        
    }
   
   //infoTxt.text='i'+yVal +'j'+xVal;
   pos.x=yVal;
   pos.y=xVal;
   return pos;
}
function onHold(){
    //if(nextTileToCall!=null){
        //findPath(nextTileToCall);
    //}
    //clear
    var hexTile;
    for (var i = 0; i < levelData.length; i++)
            for (var j = 0; j < levelData[0].length; j++)
            {
                if(levelData[i][j]!=-1){
                hexTile=hexGrid.getByName("tile"+i+"_"+j);
                hexTile.clearNode();
                }
            }
            showingPath=false;
}
function findPath(tile){//passes in a hexTileNode
    console.log('exploring '+tile.originali+':'+tile.originalj);
    tile.markDirty();
    if(Phaser.Point.equals(tile,endTile)){
        //success, destination reached
        console.log('end');
    }else{//find all neighbors
        var neighbors=getNeighbors(tile.originali,tile.originalj);
        var newPt=new Phaser.Point();
        var hexTile;
        var totalCost=0;
        var currentLowestCost=100000;
        var nextTile;
        //find heuristics & cost for all neighbors
        while(neighbors.length){
            newPt=neighbors.shift();
            hexTile=hexGrid.getByName("tile"+newPt.x+"_"+newPt.y);
            if(!hexTile.nodeClosed){//if node was not already calculated
                if((hexTile.nodeVisited && tile.cost+10<hexTile.cost) ||
                !hexTile.nodeVisited){//if node was already visited, compare cost
                    hexTile.getHeuristic(endTile.originali,endTile.originalj);
                    hexTile.cost=tile.cost+10;
                    hexTile.previousNode=tile;//point to previous node
                    hexTile.nodeVisited=true;
                    //hexTile.showDifference();//display heuristic & cost
                }else continue;
                totalCost=hexTile.cost+hexTile.heuristic;
                if(totalCost<currentLowestCost){//selct the next neighbour with lowest total cost
                    nextTile=hexTile;
                    currentLowestCost=totalCost;
                }
            }
        }
        tile.nodeClosed=true;
        if(nextTile!=null){
            findPath(nextTile);//call algo on the new tile
            nextTileToCall=nextTile;
        }else{
            nextTileToCall=null;
        }
    }
}
function getNeighbors(i,j){
    //first add common elements for odd & even cols
    var tempArray=[];
    var newi=i-1;//t even odd
    var newj=j;
    populateNeighbor(newi,newj,tempArray);
    newi=i+1;
    newj=j;//b even odd
    populateNeighbor(newi,newj,tempArray);
    newi=i;
    newj=j-1;//lt odd lb even
    populateNeighbor(newi,newj,tempArray);
    newi=i;//rt odd rb even
    newj=j+1;
    populateNeighbor(newi,newj,tempArray);
    //now add the different neighbours for odd & even cols
    if(j%2==0){//based on j
        newi=i-1;
        newj=j-1;//lt even
        populateNeighbor(newi,newj,tempArray);
        newj=j+1;//rt even 
        populateNeighbor(newi,newj,tempArray);
    }else{
        newi=i+1;
        newj=j-1;//lb odd
        populateNeighbor(newi,newj,tempArray);
        newj=j+1;//rb odd
        populateNeighbor(newi,newj,tempArray);
    }
    
    return tempArray;
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
function populateNeighbor(i,j, tempArray){//check & add new neighbor
    var newPt=new Phaser.Point();
    if(!checkforBoundary(i,j)){
        if(!checkForOccuppancy(i,j)){
            newPt=new Phaser.Point();
            newPt.x=i;
            newPt.y=j;
            tempArray.push(newPt);
        }
    }
}
function transpose(a) {
    return Object.keys(a[0]).map(
        function (c) { return a.map(function (r) { return r[c]; }); }
        );
}