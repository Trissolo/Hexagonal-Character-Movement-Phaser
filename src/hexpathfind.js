/*global Phaser*/
/* hexagonal A* pathfinding following http://www.policyalmanac.org/games/aStarTutorial.htm */

var game = new Phaser.Game(800, 680, Phaser.AUTO, 'TutContainer', { preload: preload, create: create});

//horizontal tile shaped level
var levelData=
[[-1,-1,-1,0,0,0,0,0,0,0,-1,-1,-1],
[-1,-1,0,0,0,0,0,0,0,0,-1,-1,-1],
[-1,-1,0,0,0,0,0,0,0,0,0,-1,-1],
[-1,0,0,0,10,0,10,0,0,0,0,-1,-1],
[-1,0,10,0,10,0,0,10,0,0,0,0,-1],
[0,0,0,0,0,0,0,0,0,0,0,0,-1],
[0,0,0,10,0,0,5,0,0,10,0,0,0],
[0,0,0,10,0,0,0,0,0,0,10,0,-1],
[-1,0,0,0,0,10,10,10,0,0,0,0,-1],
[-1,0,0,0,10,0,0,0,0,0,0,-1,-1],
[-1,-1,0,0,0,0,0,0,0,0,0,-1,-1],
[-1,-1,0,0,0,0,0,0,0,0,-1,-1,-1],
[-1,-1,-1,0,0,0,0,0,0,0,-1,-1,-1]];

var bmpText;
var hexTileHeight=61;
var hexTileWidth=52;
var hexGrid;
var prevTile= new Phaser.Point();
var endTile;
var startTile= new Phaser.Point();
var nextTileToCall;
var showingPath;
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
    bmpText = game.add.bitmapText(10, 10, 'font', 'Hex Path Find\nTap on empty tile\nTap Hold to clear', 18);
    game.stage.backgroundColor = '#cccccc';
    createLevel();
    
    game.input.onHold.add(onHold);//hold to clear path
    game.input.holdRate=500;
    // Maintain aspect ratio
    game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    
    game.input.onTap.add(onTap);//tap to find path
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
                if(levelData[i][j]==5){
                    startTile.x=i;
                    startTile.y=j;
                }
            }
        }
        
    }
    hexGrid.x=50;
    hexGrid.y=50;
}
function onTap(){
    if(showingPath)return;
    var tile= findCubicHexTile();
    //convert to offset
    tile=axialToOffset(tile);
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
function findCubicHexTile(){
    var pos=game.input.activePointer.position;
    pos.x-=hexGrid.x;
    pos.y-=hexGrid.y;
    //console.log(pos.x+':'+ pos.y);
    return screenToAxial(pos);
}
function onHold(){
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
    //tile.markDirty();
    if(Phaser.Point.equals(tile,endTile)){
        //success, destination reached
        console.log('success');
        //now paint the path.
        paintPath(tile);
    }else{//find all neighbors
        var neighbors=getNeighbors(tile.originali,tile.convertedj);
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
                //it should be tile.cost+10<hexTile.cost but it gets us trapped in caves
                if((hexTile.nodeVisited && (tile.cost+10)<hexTile.cost) ||
                !hexTile.nodeVisited){//if node was already visited, compare cost
                    hexTile.getHeuristic(endTile.originali,endTile.originalj);
                    hexTile.cost=tile.cost+10;
                    hexTile.previousNode=tile;//point to previous node
                    hexTile.nodeVisited=true;
                    hexTile.showDifference();//display heuristic & cost
                }else continue;
                totalCost=hexTile.cost+hexTile.heuristic;
                if(totalCost<currentLowestCost){//selct the next neighbour with lowest total cost
                    nextTile=hexTile;
                    currentLowestCost=totalCost;
                }
            }else{
                console.log('node closed');
            }
        }
        //console.log(tile.previousNode);
        tile.nodeClosed=true;
        if(nextTile!=null){
            findPath(nextTile);//call algo on the new tile
            nextTileToCall=nextTile;
        }else{
            if(tile.previousNode!=null){
                //current tile is now closed, open previous tile and redo.
                console.log('special call');
                tile.previousNode.cost-=10;
                tile.previousNode.nodeClosed=false;
                findPath(tile.previousNode);//call algo on the previous tile
                nextTileToCall=tile.previousNode;
            }else{
               //no path
               nextTileToCall=null; 
            }
        }
    }
}
function paintPath(tile){
    tile.markDirty();
    if(tile.previousNode!=null){
        paintPath(tile.previousNode);
    }
}
function getNeighbors(i,j){
    //coordinates are in axial
    var tempArray=[];
    var axialPoint=new Phaser.Point(i,j);
    var neighbourPoint=new Phaser.Point();
    //axialPoint=offsetToAxial(axialPoint);
    neighbourPoint.x=axialPoint.x-1;//tr
    neighbourPoint.y=axialPoint.y;
    populateNeighbor(neighbourPoint.x,neighbourPoint.y,tempArray);
    neighbourPoint.x=axialPoint.x+1;//bl
    neighbourPoint.y=axialPoint.y;
    populateNeighbor(neighbourPoint.x,neighbourPoint.y,tempArray);
    neighbourPoint.x=axialPoint.x;//l
    neighbourPoint.y=axialPoint.y-1;
    populateNeighbor(neighbourPoint.x,neighbourPoint.y,tempArray);
    neighbourPoint.x=axialPoint.x;//r
    neighbourPoint.y=axialPoint.y+1;
    populateNeighbor(neighbourPoint.x,neighbourPoint.y,tempArray);
    neighbourPoint.x=axialPoint.x-1;//tr
    neighbourPoint.y=axialPoint.y+1;
    populateNeighbor(neighbourPoint.x,neighbourPoint.y,tempArray);
    neighbourPoint.x=axialPoint.x+1;//bl
    neighbourPoint.y=axialPoint.y-1;
    populateNeighbor(neighbourPoint.x,neighbourPoint.y,tempArray);
    
    //tempArray.sort(costSort);
    
    return tempArray;
}
/*
function costSort(a,b){
    //sort neighbours by tile cost so that we get better path-
    //non visited nodes come first, 
    //visited nodes get sorted by cost where higher cost come first
    //closed nodes come last
    var hexTileA=hexGrid.getByName("tile"+a.x+"_"+a.y);
    var hexTileB=hexGrid.getByName("tile"+b.x+"_"+b.y);
    if(hexTileA.nodeClosed && hexTileB.nodeClosed){
        return 0;
    }else if(hexTileA.nodeClosed && !hexTileB.nodeClosed){
        return 1;
    }else if(!hexTileA.nodeClosed && hexTileB.nodeClosed){
        return -1;
    }else if(hexTileA.nodeVisited && hexTileB.nodeVisited){
        return hexTileB.cost-hexTileA.cost;
    }else if(!hexTileA.nodeVisited && !hexTileB.nodeVisited){
        return hexTileB.cost-hexTileA.cost;
    }else if(!hexTileA.nodeVisited && hexTileB.nodeVisited){
        return -1;
    }else if(hexTileA.nodeVisited && !hexTileB.nodeVisited){
        return 1;
    }
}*/
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
    var nPoint=new Phaser.Point(i,j);
    nPoint=axialToOffset(nPoint);
    if(!checkforBoundary(nPoint.x,nPoint.y)){
        if(!checkForOccuppancy(nPoint.x,nPoint.y)){
            tempArray.push(nPoint.clone());
        }
    }
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