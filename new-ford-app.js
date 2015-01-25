function cartoMap(query, divID) { 
	var account_name = 'sgcm';
	var cssDictionary = ['#006D2C', '#2CA25F', '#66C2A4', '#B2E2E2', '#EDF8FB'];// color ramp
 
	// initial cartoCSS for National and Subnational levels
	var cssInitial_Nat = "[zoom<=3]{#world_borders{  polygon-fill: #EDF8FB;  polygon-opacity: 0.8;  line-color: #FFF;  line-width: 1;  line-opacity: 1;}#world_borders [ total_amount <= 1781668262.38] {   polygon-fill: " + cssDictionary[0] + ";}#world_borders [ total_amount <= 31403245] {   polygon-fill:" + cssDictionary[1] + ";}#world_borders [ total_amount <= 3713003.72] {   polygon-fill: " + cssDictionary[2] + ";}#world_borders [ total_amount <= 1144718] {   polygon-fill:" + cssDictionary[3] + ";} #world_borders [ total_amount <= 400000] {   polygon-fill: " + cssDictionary[4] + ";}}";
	var cssInitial_SubNat = "[zoom>3]{#subnat{  polygon-fill: #EDF8FB;  polygon-opacity: 0.8;  line-color: #FFF;  line-width: 1;  line-opacity: 1;}#subnat [ total_amount <= 118349410.5] {   polygon-fill:" + cssDictionary[0] + ";}#subnat [ total_amount <= 11477333] {   polygon-fill: " + cssDictionary[1] +";}#subnat [ total_amount <= 4490000] {   polygon-fill: " + cssDictionary[2] + ";}#subnat [ total_amount <= 1485000] {   polygon-fill: " + cssDictionary[3] + ";}#subnat [ total_amount <= 500000] {   polygon-fill: " + cssDictionary[4] + ";}}";
 	var $container;

	this.createMap = function () {
 
		var InitialCenter = new L.LatLng(40, 0);
		var map = L.map(divID, { zoomControl: false});
		var splitParam = function(param, delimiter){
			var ix = param.indexOf(delimiter);
			var param1 = param.substring(0,ix);
			var param2 = param.substring(ix + delimiter.length, param.length);
			return {natQuery:param1, subnatQuery:param2};
		}
		var queriesObj = splitParam(query, " && ");
		var queryInitial_Nat = queriesObj.natQuery;
		var queryInitial_SubNat = queriesObj.subnatQuery;

		//setting private vars
		$container = $('#'+divID);

		// Create map
		map.setView(InitialCenter, 3);
		L.tileLayer('http://a.tiles.mapbox.com/v3/fordfoundation.370e1581/{z}/{x}/{y}.png', {
			attribution: ''
		}).addTo(map);
		cartodb.createLayer(map,
			{
				user_name: account_name,
				type: 'cartodb',
				sublayers: [
					{
						sql: queryInitial_Nat,
						cartocss: cssInitial_Nat,
						interactivity: 'cartodb_id, total_amount, locationname'
					},
					{
						sql: queryInitial_SubNat,
						cartocss: cssInitial_SubNat,
						interactivity: 'cartodb_id, total_amount, locationname, country'
					}
				]
			}
		)
		.addTo(map)
		.on('done', function(layer) {
			var natsublayer= layer.getSubLayer(0); 
			var subnatsublayer= layer.getSubLayer(1); 
			natsublayer.setInteraction(true);
			subnatsublayer.setInteraction(true);

			natsublayer.on('featureOver', function (e, pos, latlng, data){
				natFeatureOver(e, pos, latlng, data);
			});

			subnatsublayer.on('featureOver', function(e, pos, latlng, data) {
				var queryForSubnational = "SELECT sum(g.amount) as total_amount FROM location l,  grants_locations gl,  grants g where l.locationname='"+data.country+"' and l.id=gl.locationid and gl.grantid=g.id and l.locationtype='Country' group by l.locationname";
				subNatFeatureOver(e, pos, latlng, data, queryForSubnational);
			});
        });


		// Create info box
		$container.append('<div class="info"></div>')
	};
 	natFeatureOver = function (e, pos, latlng, data){
		var value= data.total_amount;
		$container.children('.info').html("<div><p><strong>" + data.locationname +"</strong></p><p>$"+value.toFixed(2)+"</p></div>");
    };
	subNatFeatureOver = function (e, pos, latlng, data, queryForSubnational){
		console.log('_________________________________________')
		console.log(queryForSubnational)
		var national_value;
		var value= data.total_amount;
		var percentage;

		if(region!=data.locationname){
			region=data.locationname;
			getNationalValue(queryForSubnational, function(national_val){
				console.log('····························')
				console.log('national value for '+queryForSubnational)
				console.log(national_val)
				console.log('····························')
				national_value=national_val;
				percentage=(value*100)/national_value;
				percentage=percentage.toFixed(1)+"%";
				$('#'+infodivID).html("<div style='padding:5px'><p><strong>" + data.locationname +"</strong></p><p>$"+value.toFixed(2)+"</p></div><div id='chart' style='float: left; width:60px;background-color: #BBBBBF'></div><div style='float: left; width:200px;background-color: #BBBBBF;height:50px'><p style='font-size: 10px;text-transform: uppercase;padding-top: 5px;'>"+percentage+" OF "+data.country+" total:</p><p>$"+national_value+"</div>");
				createDonnutChart(value,national_value)
			});
		}          
    };

	this.createMap();
};