function findRelation(userid){
	return $.ajax({
		method:'GET',
		url:'127.0.0.1:3000/relation' + userid
	})
}

//draw:
findRelation('id_a').done((data)=>{draw(data)});

//merge:
findRelation('id_b').done(data=>{merge(data,model)});