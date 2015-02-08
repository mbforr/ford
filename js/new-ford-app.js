function cartoMap(query, divID, colors) { 
	var account_name = 'sgcm',
		delimiter = ' && ';

	var cssDictionary = ['#006D2C', '#2CA25F', '#66C2A4', '#B2E2E2', '#EDF8FB'];// color ramp,
		borderColor = '#FFF',
		polygonFillColor = '#EDF8FB';
 
	// initial cartoCSS for National and Subnational levels
	var cssInitial_Nat,
		cssInitial_SubNat,
		$container,
		natsublayer,
		subnatsublayer;

	var splitParam = function(param, delimiter){
		var ix = param.indexOf(delimiter);
		var param1 = param.substring(0,ix);
		var param2 = param.substring(ix + delimiter.length, param.length);
		return {natQuery:param1, subnatQuery:param2};
	}


	function createDonnutChart(value, national_value){
		var chart = c3.generate({
			bindto: '#'+ divID + ' .chart',
			size: { height: 50, width: 60 },
			data: {
				columns: [
					['data1', value],
					['data2', national_value],
				],
				type : 'donut'
			},
			color: {
				pattern: ['#10AA33', '#090']
			},
			donut: {
				label: {
					show: false,
				}
			},
			legend: { show: false },
			tooltip: { show: false }
		});
	};

	var createMap = function () {
		if(colors !== null && typeof colors == "object") {
			cssDictionary = colors.cssDictionary;
			borderColor = colors.borderColor;
			polygonFillColor = colors.polygonFillColor;
		}
		cssInitial_Nat = "[zoom<=3]{#world_borders{  polygon-fill: "+polygonFillColor+";  polygon-opacity: 0.8;  line-color: "+borderColor+";  line-width: 1;  line-opacity: 1;}#world_borders [ total_amount <= 1781668262.38] {   polygon-fill: " + cssDictionary[0] + ";}#world_borders [ total_amount <= 31403245] {   polygon-fill:" + cssDictionary[1] + ";}#world_borders [ total_amount <= 3713003.72] {   polygon-fill: " + cssDictionary[2] + ";}#world_borders [ total_amount <= 1144718] {   polygon-fill:" + cssDictionary[3] + ";} #world_borders [ total_amount <= 400000] {   polygon-fill: " + cssDictionary[4] + ";}}";
		cssInitial_SubNat = "[zoom>3]{#subnat{  polygon-fill: "+polygonFillColor+";  polygon-opacity: 0.8;  line-color: "+borderColor+";  line-width: 1;  line-opacity: 1;}#subnat [ total_amount <= 118349410.5] {   polygon-fill:" + cssDictionary[0] + ";}#subnat [ total_amount <= 11477333] {   polygon-fill: " + cssDictionary[1] +";}#subnat [ total_amount <= 4490000] {   polygon-fill: " + cssDictionary[2] + ";}#subnat [ total_amount <= 1485000] {   polygon-fill: " + cssDictionary[3] + ";}#subnat [ total_amount <= 500000] {   polygon-fill: " + cssDictionary[4] + ";}}";
 
		var InitialCenter = new L.LatLng(40, 0);
		var map = L.map(divID, { zoomControl: false});
		var queriesObj = splitParam(query, delimiter);
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
			natsublayer= layer.getSubLayer(0); 
			subnatsublayer= layer.getSubLayer(1); 
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
		$('<div class="info"></div>').appendTo($container).mousemove(function(event){event.stopImmediatePropagation()});
	};
 	var natFeatureOver = function (e, pos, latlng, data){
		var value= data.total_amount;
		$container.children('.info').html("<div><p><strong>" + data.locationname +"</strong></p><p>$"+value.toFixed(2)+"</p></div>");
    };
	var subNatFeatureOver = function (e, pos, latlng, data, queryForSubnational){
		var value= data.total_amount;
		var national_value;
		var subNationalName = data.locationname;
		var nationalName = data.country;
		$.getJSON('http://'+account_name+'.cartodb.com/api/v2/sql/?q='+queryForSubnational, function(data) {
			$container.children('.info').html( 
				"<div>"+
					"<p><strong>" + subNationalName +"</strong></p>"+
					"<p>$"+value.toFixed(2)+"</p>"+
				"</div>"
			);
			var result = data.rows[0];
			national_value = result.total_amount;
			var percentage = (value / national_value)*100;
			$container.children('.info').append(
				"<div><p><strong>" + nationalName + "</strong></p><p>$"+national_value.toFixed(2)+"</p></div>" + 
				"<div><p><strong>% of national total:</strong></p><p>"+percentage.toFixed(2)+"%</p></div>" +
				"<div class='chart'></div>"
			);
			createDonnutChart(value,national_value);
		});

    };
    this.update = function(query, layer){
    	if(query.indexOf(delimiter) == -1){
    		if(layer == null || layer == 'nat'){
		    	natsublayer.setSQL(query);
		    	subnatsublayer.hide();
    		} else if (layer == 'subnat'){
		    	subnatsublayer.setSQL(query);
		    	natsublayer.hide();
    		}
    	} else {
			var queriesObj = splitParam(query, delimiter);
			natsublayer.show();
			natsublayer.setSQL(queriesObj.natQuery);
			subnatsublayer.show();
			subnatsublayer.setSQL(queriesObj.subnatQuery);
    	}
    };
	createMap();
};