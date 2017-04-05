** 功能概述
与后端数据交互：
	1. 输入人名，查出其relation，并展示其relation
	可能是多个人
	2. 对目前relation graph中的某一节点a，进行查询，将a的relation，merge进当前relation graph中
纯前端完成：
	1. 封装点、线
	2. 单击高亮点、单击高亮线
	3. 滚轮缩放
	4. 单击拖拽 旋转camera视角
	5. 删除某一节点，与之相关的线亦随之删除
	6. 修改节点与边的颜色、大小、粗细、标签
	7. 重置展示图
	8. 是否能拖动以改变某一点的位置？？？

function draw(id) {}

function merge(id) {}

function highlightPoint(point){}

function highlightLint(line){}

function deletePoint(point) {}

function resetGraph() {
	// body...
}

point{
	function setPointColor(color) {}

	function setPointSize(sizeValue) {}

	function setPointThick(thickValue) {}

	function setPointLabel(label) {}
}

line{
	function setLineColor(color) {}

	function setLineSize(sizeValue) {}

	function setLineThick(thickValue) {}

	function setLineLabel(label) {}
}


