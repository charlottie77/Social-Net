/**
 * Created by yuqing.kwok on 2017/4/9.
 */

//if ( ! Detector.webgl ) Detector.addGetWebGLMessage();
var container;
var renderer, scene, camera, stats,controls;
var groupSephere, groupLine, groupInfo;
var linkNum;
var raycaster, intersects;
var mouse, INTERSECTED;
var width = window.innerWidth;
var height = window.innerHeight;
var spheres = [];
let persons = [];
var three_links = [];
var relationgraph = [];

var targetRotation = 0;
var targetRotationOnMouseDown = 0;
var mouseX = 0;
var mouseXOnMouseDown = 0;
var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;
var helpPlane;
var offset = new THREE.Vector3();



var myLineMaterial = new THREE.LineDashedMaterial( { color: 0x7ebac4, dashSize: 1, gapSize: 0.5 } );
//var myLineMaterial = new THREE.LineBasicMaterial( { color: 0x7ebac4 } );
var mySphereMaterial = new THREE.MeshPhongMaterial({ color: 0x7ebac4 });


class Person {
    constructor(id, pos_x, pos_y, pos_z, data = {}) {
        var radius = 5,
            segments = 16,
            rings = 16;
        this.node = new THREE.Mesh(
            new THREE.SphereGeometry(
                radius,
                segments,
                rings),
            mySphereMaterial);
        this.node.position.set(pos_x, pos_y, pos_z);
        this.id = id;
        this.data = data;

        this.node.userData = {arrLinkLines:[]};
    }
    set_name(name) {
        this.node.name = name;
    }

    set_pos(pos_x, pos_y, pos_z) {
        this.node.position.set(pos_x,pos_y,pos_z);
    }
    get_pos() {
        return this.node.position;
    }
    get_obj() {
        return this.node;
    }
    get_name() {
        return this.node.name;
    }
    get_id() {
        return this.id;
    }

    set_links(uuid,line){
        this.node.userData.arrLinkLines[uuid] = this.node.userData.arrLinkLines.length;
        this.node.userData.arrLinkLines.push(line);
    }
    get_links(){return links}

    move_withLine(groupLine){
        this.node.userData.arrLinkLines.forEach(function(line){
            //console.log(uuid);// @注：回调函数的参数就是遍历的每一个对象，这里就是点击的球的每一个连接线uuid
            // let line = groupLine.getObjectByProperty('uuid',uuid);// @注：拿到该线对象
            let uuid = line.uuid;
            let sourcePer = line.userData.source; // @注：提前取出source和target名称数据，等会儿删了就没法取了
            let targetPer = line.userData.target;
            let index = groupLine.children.indexOf(line);// @注：拿到该线在groupLine.children数组中的位置，方便删除
            if(index !== -1){// @注：执行了一次删除后这个index在下一次move事件响应的时候有可能还没有生成新的线所以会找不到，返回-1。找不到的时候就不应该再删线了。
                let sourceNode = sourcePer.get_obj();
                let targetNode = targetPer.get_obj();
                // let sourceNode = groupSephere.getObjectByName(sourceName);
                // let targetNode = groupSephere.getObjectByName(targetName);
                let sourcePosition = sourceNode.position;
                let targetPosition = targetNode.position;

                let geometry = new THREE.Geometry();
                geometry.vertices.push(sourcePosition);
                geometry.vertices.push(targetPosition);
                geometry.computeLineDistances();

                //let newLine = new THREE.Line(geometry, new THREE.LineDashedMaterial( { color: 0xffffff, dashSize: 1, gapSize: 0.5 }));
                let newLine = new THREE.Line(geometry, myLineMaterial);

                let indexInSource = sourceNode.userData.arrLinkLines[uuid];
                let indexInTarget = targetNode.userData.arrLinkLines[uuid];

                if(indexInSource === -1 || indexInTarget === -1){
                    console.error('异步过程异常，暂停');
                    debugger;
                }else{
                    sourceNode.userData.arrLinkLines[indexInSource] = newLine;
                    sourceNode.userData.arrLinkLines[newLine.uuid] = indexInSource;
                    delete sourceNode.userData.arrLinkLines[uuid];

                    targetNode.userData.arrLinkLines[indexInTarget] = newLine;
                    targetNode.userData.arrLinkLines[newLine.uuid] = indexInTarget;
                    delete targetNode.userData.arrLinkLines[uuid];
                }

                // @注：同时线要记录下它连接的球的名字，之后靠这个知道要修改哪几个球的arrLinkLines
                newLine.userData={
                    target:targetPer,
                    source:sourcePer
                }
                groupLine.remove(line);// @注：删线
                groupLine.add(newLine);// @注：加线，删线加线连在一起操作是为了减少两者之间的时间，间隔越短越不容易观察到线的短暂消失
            }

        });
    }

    get_color(){
        return this.node.material.color;
    }

    set_color(hexColor){
        this.node.material = new THREE.MeshLambertMaterial({ color: hexColor });
    }

    set_scale(scalar){
        this.node.scale.set(scalar,scalar,scalar);
    }

    get_scale(scale){
        return this.node.scale;
    }

}

class Relation {
    constructor(source_per, target_per) {
        var geometry = new THREE.Geometry();
        geometry.vertices.push( source_per.get_pos() );
        geometry.vertices.push( target_per.get_pos() );
        geometry.computeLineDistances();

        this.line = new THREE.Line( geometry,  myLineMaterial);
       source_per.set_links(this.line.uuid, this.line);
       target_per.set_links(this.line.uuid, this.line);

        this.line.userData = {
            source:source_per,
            target:target_per
        };

    }
    get_obj() {
        return this.line;
    }
    set_target(){}
    set_source(){}
    get_target(){}
    get_source(){}
}



init();
//drawCanvasTexture();
animate();

function init() {
    container = document.getElementById( 'container' );
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    camera = new THREE.PerspectiveCamera( 45, width / height, 1, 1000 );
    camera.position.set(0, 0, 400);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    controls = new THREE.OrbitControls( camera,container );
    controls.target = new  THREE.Vector3(0, 0, 0);
    controls.maxDistance = 300;

    scene = new THREE.Scene();
    scene.add(camera);

    groupSephere = new THREE.Group();
    groupSephere.position.y = 50;
    scene.add( groupSephere );

    groupLine = new THREE.Group();
    groupLine.position.y = 50;
    scene.add( groupLine );

    groupInfo = new THREE.Group();
    groupInfo.position.y = 50;
    scene.add(groupInfo);

    renderer = new THREE.WebGLRenderer({antialiasing: true});
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize(width, height);
    renderer.setClearColor( 0x000000);

    container.appendChild( renderer.domElement );


    var axisHelper = new THREE.AxisHelper( 500 );
    scene.add( axisHelper );

    var simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(function(d) { return d.id; }))
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(width / 2, height / 2));



    d3.json("policeData.json", function(error, graph) {
        window.GRAPH=graph;
        if (error) throw error;
        simulation
            .nodes(graph.nodes);
        simulation.force("link")
            .links(graph.links);
        //console.log(graph.nodes[1].id);
        linkNum = graph.links.length;
        console.log(linkNum);
        for(let i = 0; i < graph.nodes.length; i++ )
        {
            var pointTemp = new THREE.Vector3(graph.nodes[i].x, graph.nodes[i].y, 0);
            relationgraph.push(pointTemp);
        }
        //set z axis
        for(let i = 3; i < 6; i++)
        {
            relationgraph[i].z = 20;
        }
        for(let i = 6; i < 10; i++)
        {
            relationgraph[i].z = 40;
        }
        for(let i = 0; i < graph.nodes.length; i++)
        {
            let tempPer = new Person(graph.nodes[i].id, relationgraph[i].x, relationgraph[i].y, relationgraph[i].z);
            groupSephere.add(tempPer.get_obj());
            //*** 肥肠trick
            persons[graph.nodes[i].id] = persons.length;
            //***
            persons.push( tempPer );
            //console.log(graph.nodes[i].name);
            persons[i].set_name(graph.nodes[i].name);
            // @注1：把没个sphere的name属性赋值为node的id（json数据里Geborand，Myriel之类的人名），之后就可以通过groupSephere.getObjectByName(那个人名)取到对应的球
            // @注2：userData属性是用来给你放自定义数据的，在这里放一个叫arrLinkLines的数组存每个球各自连着的线的uuid，这个uuid是什么下面有讲
        }
        drawCanvasTexture();
        for(let i = 0; i < graph.links.length; i++)
        {
            // @注：通用材质不要每次都new，性能开销大，在声明全局变量myLineMaterial一直用，就像C++ define常量
            let sourcePer = persons[persons[graph.links[i].source.id]];
            let targetPer = persons[persons[graph.links[i].target.id]];
            let tempRe = new Relation(sourcePer,targetPer);
            // console.log(line.uuid);
            groupLine.add(tempRe.get_obj());
        }
    });

    var material1 = new THREE.MeshStandardMaterial( {
        opacity: 0,
        transparent: true
    } );
    helpPlane = new THREE.Mesh(new THREE.PlaneBufferGeometry(500, 500, 8, 8), material1);
    //helpPlane.visible = false;
    scene.add(helpPlane);

    var matYear = new THREE.MeshStandardMaterial( {
        opacity: 0.5,
        transparent: true
    } );
    var firstYear = new THREE.Mesh(new THREE.PlaneBufferGeometry(100, 100), matYear);
    //firstYear.position.x = 50;
    firstYear.position.y = 50;
    firstYear.position.z = 20;

    var secondYear = new THREE.Mesh(new THREE.PlaneBufferGeometry(100, 100), matYear);
    //secondYear.position.x = 50;
    secondYear.position.y = 50;
    secondYear.position.z = 40;

    //scene.add(firstYear);
    //scene.add(secondYear);

    var pointLight = new THREE.PointLight( 0xFFFFFF,1, 500,2 );
    // set its position
    pointLight.position.x = 50;
    pointLight.position.y = 100;
    pointLight.position.z = 10;

    var pointLight1 = new THREE.PointLight( 0xFFFFFF,1 , 500,2);

    // set its position
    pointLight1.position.x = -50;
    pointLight1.position.y = 0;
    pointLight1.position.z = 10;

    var pointLight2 = new THREE.PointLight( 0xFFFFFF,1 , 500,2);

    // set its position
    pointLight2.position.x = 0;
    pointLight2.position.y = 150;
    pointLight2.position.z = 50;

    var pointLight3 = new THREE.PointLight( 0xFFFFFF,1 , 500,2);

    // set its position
    pointLight3.position.x = 0;
    pointLight3.position.y = 150;
    pointLight3.position.z = -50;

    //add to the scene
    scene.add(pointLight);
    scene.add(pointLight1);
    scene.add(pointLight2);
    scene.add(pointLight3);

    stats = new Stats();
    container.appendChild( stats.dom );
    renderer.domElement.addEventListener( 'mousemove', onDocumentMouseMove, false );
    renderer.domElement.addEventListener( 'mousedown', onDocumentMouseDown, false );
    renderer.domElement.addEventListener( 'mouseup', onDocumentMouseUp,false);
    //document.addEventListener( 'touchstart', onDocumentTouchStart, false );
    //document.addEventListener( 'touchmove', onDocumentTouchMove, false );
    renderer.domElement.addEventListener( 'resize', onWindowResize, false );

}

function drawCanvasTexture() {
    //canvas draw

    var offset = new THREE.Vector3(0,7,0);
    for(let i = 0; i < persons.length; i++)
    {
        console.log('success2');

        var canvass = document.createElement('canvas');
        //document.body.appendChild(canvass);
        canvass.width = 600;
        canvass.height = 150;
        canvass.style.width = '600px';
        canvass.style.height = '150px';

        var ctx = canvass.getContext('2d');
        ctx.font = '75px serif';
        ctx.fillStyle = '#ffffff';
       // console.log(persons.length + 'p');
        ctx.fillText(persons[i].get_name(), 0, 60);
        ctx.fillText(persons[i].get_id(), 0, 130);
        var matNodeInfo = new THREE.MeshBasicMaterial();
        var node_info = new THREE.Mesh(new THREE.PlaneBufferGeometry(10, 2.5), matNodeInfo);
        //var texture1 = new THREE.Texture(canvass);
        console.log(persons[i].get_name() + 'print');
        matNodeInfo.map = new THREE.CanvasTexture(canvass);
        //matNodeInfo.map.needsUpdate = true;
        //console.log(persons[i].get_pos());

        var info_pos = new THREE.Vector3(persons[i].get_pos().x, persons[i].get_pos().y, persons[i].get_pos().z);
        info_pos.add(offset);
        //info_pos.add(offset);
        console.log(info_pos);
        node_info.position.set(info_pos.x, info_pos.y, info_pos.z);
        console.log(JSON.stringify(node_info.position) + 'mb');
        groupInfo.add(node_info);
        //ctx.clearRect(0, 0, 600, 150);
    }
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function onDocumentMouseDown( event ) {
    event.preventDefault();
    console.log('a');
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera( mouse, camera );
    var sects = raycaster.intersectObjects(groupSephere.children);

    if(sects.length > 0)
    {
        controls.enabled = false;
        INTERSECTED = sects[0].object;
        console.log(INTERSECTED);

    }
    var interp = raycaster.intersectObject(helpPlane);
    // console.log(interp[0]);
    offset.copy(interp[0].point).sub(helpPlane.position);
}

function onDocumentMouseMove( event ) {
    event.preventDefault();
    console.log('b');
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera( mouse, camera );

    intersects = raycaster.intersectObjects( groupSephere.children );
    if(INTERSECTED)
    {
        var interp = raycaster.intersectObject( helpPlane );
        // console.log(interp[0]);
        INTERSECTED.position.copy(interp[0].point.sub(offset));
        // console.log(INTERSECTED.name);
        // console.log(persons[INTERSECTED.name]);
        let personIndex = persons[INTERSECTED.name];
        persons[personIndex].move_withLine(groupLine);
        window.debugPerson = persons[personIndex];
        //@注：forEach遍历比较方便，而且forEach是回调式不会阻塞，for循环会阻塞主线程

    }
    else
    {
        var sects = raycaster.intersectObjects( groupSephere.children );

        if(sects.length > 0)
        {
            helpPlane.position.copy(sects[0].object.position);
            helpPlane.lookAt(camera.position);



        }
    }
    for(let i = 0; i < persons.length; i++)
    {
        groupInfo.children[i].lookAt(camera.position);
    }

// //hover turn red
//                raycaster.setFromCamera( mouse, camera );
//
//                intersects = raycaster.intersectObjects( spheres );
//                console.log(spheres);
//
//                if (intersects.length > 0) { //如果有捕捉到object
//                    if (INTERSECTED != intersects[0].object) { //如果换了一个object
//                        if (INTERSECTED) INTERSECTED.material.color.setHex(INTERSECTED.currentHex); // 将上一个改回他原本的颜色
//                        INTERSECTED = intersects[0].object;  //选中第一个
//                        INTERSECTED.currentHex = INTERSECTED.material.color.getHex(); //取到原本的颜色
//                        INTERSECTED.material.color.set( 0xff0000 ); //将选中的改为红色
//                    }
//                }
//                else {
//                    if (INTERSECTED) INTERSECTED.material.color.set(INTERSECTED.currentHex);
//                    INTERSECTED = null;
//                }
////hover turn red end
    //targetRotation = targetRotationOnMouseDown + ( mouseX - mouseXOnMouseDown ) * 0.02;
}

function onDocumentMouseUp( event ) {
    controls.enabled = true;
    INTERSECTED = null;

}
function animate() {
    requestAnimationFrame( animate );
    render();
    stats.update();
}
function render() {


    controls.update();

    renderer.render( scene, camera );
}
