/**
 * Created by yuqing.kwok on 2017/4/9.
 */

//if ( ! Detector.webgl ) Detector.addGetWebGLMessage();
var container;
var renderer, scene, camera, stats,controls;
var groupSephere, groupLine;
var linkNum;
var raycaster, intersects;
var mouse, INTERSECTED;
var width = window.innerWidth;
var height = window.innerHeight;
//var canvas = document.querySelector("canvas");
//var context = canvas.getContext("2d");
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
        this.node.name = id;
        this.data = data;

        this.node.userData = {arrLinkLines:[]};
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

                    // sourceNode.userData.arrLinkLines.splice(indexInSource,1);
                    // sourceNode.userData.arrLinkLines.push(line.uuid);

                    // targetNode.userData.arrLinkLines.splice(indexInTarget,1);
                    // targetNode.userData.arrLinkLines.push(line.uuid);
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
       //source_per.node.userdata.arrLinkLines.push(this.line.uuid);

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


//                controls.rotateSpeed = 5.0;
//				  controls.zoomSpeed = 3.0;
//                controls.panSpeed = 0.8;
//                controls.noZoom = false;
//                controls.noPan = false;
//                controls.staticMoving = true;
//                controls.dynamicDampingFactor = 0.3;

    scene = new THREE.Scene();
    scene.add(camera);

    groupSephere = new THREE.Group();
    groupSephere.position.y = 50;
    scene.add( groupSephere );

    groupLine = new THREE.Group();
    groupLine.position.y = 50;
    scene.add( groupLine );

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

    for (var i = 0; i < 16; i++) {
        // set up the sphere vars
        // var radius = 5,
        //     segments = 16,
        //     rings = 16;
        //
        // // create the sphere's material
        // // @注：全局声明常量材质
        // // var sphereMaterial = new THREE.MeshLambertMaterial(
        // //     {
        // //         color: 0x6bcbc8
        // //     });
        //
        // var sphere = new THREE.Mesh(
        //     new THREE.SphereGeometry(
        //         radius,
        //         segments,
        //         rings),
        //     mySphereMaterial);
        //
        // spheres.push(sphere);
        //
        // // add the sphere to the scene
        // groupSephere.add(sphere);

    }



    d3.json("mesi.json", function(error, graph) {
        window.GRAPH=graph;
        if (error) throw error;
        simulation
            .nodes(graph.nodes);
        //  .on("tick", ticked);

        simulation.force("link")
            .links(graph.links);
        console.log(graph.nodes[1].id);
//                    d3.select(canvas)
//                        .call(d3.drag()
//                            .container(canvas)
//                            .subject(dragsubject)
//                            .on("start", dragstarted)
//                            .on("drag", dragged)
//                            .on("end", dragended));
        linkNum = graph.links.length;
        for(let i = 0; i < 16; i++ )
        {
            var pointTemp = new THREE.Vector3(graph.nodes[i].x, graph.nodes[i].y, 0);
            relationgraph.push(pointTemp);
        }
        for(let i = 0; i < 16; i++)
        {
            let tempPer = new Person(graph.nodes[i].id, relationgraph[i].x, relationgraph[i].y, 0);
            groupSephere.add(tempPer.get_obj());
            //*** 肥肠trick
            persons[graph.nodes[i].id] = persons.length;
            //***
            persons.push( tempPer );
            // @注1：把没个sphere的name属性赋值为node的id（json数据里Geborand，Myriel之类的人名），之后就可以通过groupSephere.getObjectByName(那个人名)取到对应的球
            // @注2：userData属性是用来给你放自定义数据的，在这里放一个叫arrLinkLines的数组存每个球各自连着的线的uuid，这个uuid是什么下面有讲
            //spheres[i].name = graph.nodes[i].id;
            //spheres[i].userData = {arrLinkLines:[]};
        }
        for(let i = 0; i < graph.links.length; i++)
        {
            // @注：通用材质不要每次都new，性能开销大，在声明全局变量myLineMaterial一直用，就像C++ define常量
            // var material = new THREE.LineBasicMaterial({ color: 0x2f5554, linewidth: 1});

            //var geometry = new THREE.Geometry();
            //geometry.vertices.push( new THREE.Vector3( graph.links[i].source.x, graph.links[i].source.y, 0 ) );
            //geometry.vertices.push( new THREE.Vector3( graph.links[i].target.x, graph.links[i].target.y, 0 ) );

            //var line = new THREE.Line( geometry, myLineMaterial );
            let sourcePer = persons[persons[graph.links[i].source.id]];
            let targetPer = persons[persons[graph.links[i].target.id]];
            let tempRe = new Relation(sourcePer,targetPer);
            // console.log(line.uuid);
            // @注1：在new了一个Line之后就可以取它的uuid属性作为唯一标识符，之后通过groupLine.getObjectByProperty('uuid',那个uuid字符串)来获取line对象
            // @注2：通过控制台输出GRAPH变量可以看到通过d3.json读取json文件生成的对象的结构，按该结构取到每个links对象的source球的名字和target球的名字，并通过groupSephere.getObjectByName方法取到该球，然后向该球userData属性中的arrLinkLines数组push那条link线的uuid。之后就可以知道动了球之后要重画哪些线了
            // groupSephere
            //     .getObjectByName(graph.links[i].source.id)
            //     .userData.arrLinkLines.push(line.uuid);
            // groupSephere
            //     .getObjectByName(graph.links[i].target.id)
            //     .userData.arrLinkLines.push(line.uuid);

            // @注：同时线要记录下它连接的球的名字，之后靠这个知道要修改哪几个球的arrLinkLines
            // line.userData={
            //     target:graph.links[i].target.id,
            //     source:graph.links[i].source.id
            // }

           // three_links.push(tempRe);
            groupLine.add(tempRe.get_obj());
//                        line.userData = {
//                            source: data.links[i].source,
//							target: data.links[i].target };
        }

//                    function ticked() {
////                        context.clearRect(0, 0, width, height);
////
////                        context.beginPath();
////                        graph.links.forEach(drawLink);
////                        context.strokeStyle = "#aaa";
////                        context.stroke();
////
////                        context.beginPath();
////                        graph.nodes.forEach(drawNode);
////                        context.fill();
////                        context.strokeStyle = "#fff";
////                        context.stroke();
//
//
//                       // renderer.render(scene, camera);
//
//                    }
    });
    var material1 = new THREE.MeshStandardMaterial( {
        opacity: 0,
        transparent: true
    } );
    helpPlane = new THREE.Mesh(new THREE.PlaneBufferGeometry(500, 500, 8, 8), material1);
    //helpPlane.visible = false;
    scene.add(helpPlane);

    //var dragControls = new THREE.DragControls( spheres, camera, renderer.domElement );
    //dragControls.addEventListener( 'dragstart', function ( event ) { controls.enabled = false; } );
    //dragControls.addEventListener( 'dragend', function ( event ) { controls.enabled = true; } );
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

    // var hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.6 );
    // hemiLight.color.setHSL( 0.6, 1, 0.6 );
    // hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
    // hemiLight.position.set( 0, 500, 0 )
    // scene.add( hemiLight );
    // //
    // var dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
    // dirLight.color.setHSL( 0.1, 1, 0.95 );
    // dirLight.position.set( -1, 1.75, 1 );
    // dirLight.position.multiplyScalar( 50 );
    // scene.add( dirLight );
    // dirLight.castShadow = true;

    // var light1 = new THREE.DirectionalLight( 0xefefff, 1.5 );
    // light1.position.set( 1, 1, 1 ).normalize();
    // scene.add( light1 );
    // var light2= new THREE.DirectionalLight( 0xffefef, 1.5 );
    // light2.position.set( -1, -1, -1 ).normalize();
    // scene.add( light2 );


    stats = new Stats();
    container.appendChild( stats.dom );
    renderer.domElement.addEventListener( 'mousemove', onDocumentMouseMove, false );
    renderer.domElement.addEventListener( 'mousedown', onDocumentMouseDown, false );
    renderer.domElement.addEventListener( 'mouseup', onDocumentMouseUp,false);
    //document.addEventListener( 'touchstart', onDocumentTouchStart, false );
    //document.addEventListener( 'touchmove', onDocumentTouchMove, false );
    renderer.domElement.addEventListener( 'resize', onWindowResize, false );

}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function onDocumentMouseDown( event ) {
    event.preventDefault();
    console.log('a');
    //document.addEventListener('mouseup', onDocumentMouseUp, false);
    //document.addEventListener('mouseout', onDocumentMouseOut, false);
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


    //mouseXOnMouseDown = event.clientX - windowHalfX;


    //targetRotationOnMouseDown = targetRotation;
}

function onDocumentMouseMove( event ) {
    event.preventDefault();
    console.log('b');
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera( mouse, camera );

    intersects = raycaster.intersectObjects( groupSephere.children );
    // console.log(intersects[0]);
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

        // INTERSECTED.userData.arrLinkLines.forEach(function(line){
        //     //console.log(uuid);// @注：回调函数的参数就是遍历的每一个对象，这里就是点击的球的每一个连接线uuid
        //     // let line = groupLine.getObjectByProperty('uuid',uuid);// @注：拿到该线对象
        //     let uuid = line.uuid;
        //     let sourcePer = line.userData.source; // @注：提前取出source和target名称数据，等会儿删了就没法取了
        //     let targetPer = line.userData.target;
        //     let index = groupLine.children.indexOf(line);// @注：拿到该线在groupLine.children数组中的位置，方便删除
        //     if(index !== -1){// @注：执行了一次删除后这个index在下一次move事件响应的时候有可能还没有生成新的线所以会找不到，返回-1。找不到的时候就不应该再删线了。
        //         let sourceNode = sourcePer.get_obj();
        //         let targetNode = targetPer.get_obj();
        //         // let sourceNode = groupSephere.getObjectByName(sourceName);
        //         // let targetNode = groupSephere.getObjectByName(targetName);
        //         let sourcePosition = sourceNode.position;
        //         let targetPosition = targetNode.position;

        //         let geometry = new THREE.Geometry();
        //         geometry.vertices.push(sourcePosition);
        //         geometry.vertices.push(targetPosition);

        //         let newLine = new THREE.Line(geometry,myLineMaterial);

        //         let indexInSource = sourceNode.userData.arrLinkLines[uuid];
        //         let indexInTarget = targetNode.userData.arrLinkLines[uuid];

        //         if(indexInSource === -1 || indexInTarget === -1){
        //             console.error('异步过程异常，暂停');
        //             debugger;
        //         }else{
        //             sourceNode.userData.arrLinkLines[indexInSource] = newLine;
        //             sourceNode.userData.arrLinkLines[newLine.uuid] = indexInSource;
        //             delete sourceNode.userData.arrLinkLines[uuid];

        //             targetNode.userData.arrLinkLines[indexInTarget] = newLine;
        //             targetNode.userData.arrLinkLines[newLine.uuid] = indexInTarget;
        //             delete targetNode.userData.arrLinkLines[uuid];

        //             // sourceNode.userData.arrLinkLines.splice(indexInSource,1);
        //             // sourceNode.userData.arrLinkLines.push(line.uuid);

        //             // targetNode.userData.arrLinkLines.splice(indexInTarget,1);
        //             // targetNode.userData.arrLinkLines.push(line.uuid);
        //         }

        //         // @注：同时线要记录下它连接的球的名字，之后靠这个知道要修改哪几个球的arrLinkLines
        //         newLine.userData={
        //             target:targetPer,
        //             source:sourcePer
        //         }

        //         groupLine.remove(line);// @注：删线
        //         groupLine.add(newLine);// @注：加线，删线加线连在一起操作是为了减少两者之间的时间，间隔越短越不容易观察到线的短暂消失
        //     }

        // });
//
//// 				    scene.remove(groupLine);
//
////                     for(let i = 0; i < linkNum; i++)
////                     {
////                         var material = new THREE.LineBasicMaterial({ color: 0x2f5554, linewidth: 1});
//
////                         var geometry = new THREE.Geometry();
////                         geometry.vertices.push( new THREE.Vector3( spheres[GRAPH.links[i].source.index].position.x, spheres[GRAPH.links[i].source.index].position.y, 0 ) );
////                         geometry.vertices.push( new THREE.Vector3( spheres[GRAPH.links[i].target.index].position.x, spheres[GRAPH.links[i].target.index].position.y, 0 ) );
//
////                         var line = new THREE.Line( geometry, material );
////                         three_links.push(line);
////                         groupLine[i] = line;
////                         scene.add(groupLine);
//// //                        line.userData = {
//// //                            source: data.links[i].source,
//// //							target: data.links[i].target };
//                     }

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
    //document.removeEventListener( 'mousemove', onDocumentMouseMove, false );
    //document.removeEventListener( 'mouseup', onDocumentMouseUp, false );
    //document.removeEventListener( 'mouseout', onDocumentMouseOut, false );
    controls.enabled = true;
    INTERSECTED = null;
}
//            function onDocumentMouseOut( event ) {
//                //document.removeEventListener( 'mousemove', onDocumentMouseMove, false );
//                document.removeEventListener( 'mouseup', onDocumentMouseUp, false );
//                document.removeEventListener( 'mouseout', onDocumentMouseOut, false );
//            }
//            function onDocumentTouchStart( event ) {
//                if ( event.touches.length == 1 ) {
//                    event.preventDefault();
//                    mouseXOnMouseDown = event.touches[ 0 ].pageX - windowHalfX;
//                    targetRotationOnMouseDown = targetRotation;
//                }
//            }
//            function onDocumentTouchMove( event ) {
//                if ( event.touches.length == 1 ) {
//                    event.preventDefault();
//                    mouseX = event.touches[ 0 ].pageX - windowHalfX;
//                    targetRotation = targetRotationOnMouseDown + ( mouseX - mouseXOnMouseDown ) * 0.05;
//                }
//            }


function animate() {
    requestAnimationFrame( animate );
    render();
    stats.update();
}
function render() {


    controls.update();

    renderer.render( scene, camera );
}
