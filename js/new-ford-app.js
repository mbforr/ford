function cartoMap(query, divID) { 

	//configurable values
	var account_name = 'sgcm',
		delimiter = ' && ',
		southWest = L.latLng(80, 120),
		northEast = L.latLng(-30, -120);

 
 	//private vars
	var cssInitial_Nat,
		cssInitial_SubNat,
		$container,
		natsublayer,
		subnatsublayer,
		cssDictionary,
		borderColor,
		polygonFillColor;

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

	var readColor = function (styleName) {
        var div = $("<div class='" + styleName + "' style='visibility:hidden' />");
        $("body").append(div);
        var color = $(div).css("background-color");
        $(div).remove();
		return color;
	}

	var createMap = function () {
		cssDictionary = [
			readColor('mapColor1'), 
			readColor('mapColor2'), 
			readColor('mapColor3'), 
			readColor('mapColor4'), 
			readColor('mapColor5')];
		borderColor = readColor('mapBorderColor');
		polygonFillColor = readColor('mapPolygonFillColor');
		cssInitial_Nat = "[zoom<=3]{#world_borders{  polygon-fill: "+polygonFillColor+";  polygon-opacity: 0.8;  line-color: "+borderColor+";  line-width: 1;  line-opacity: 1;}#world_borders [ total_amount <= 1781668262.38] {   polygon-fill: " + cssDictionary[0] + ";}#world_borders [ total_amount <= 31403245] {   polygon-fill:" + cssDictionary[1] + ";}#world_borders [ total_amount <= 3713003.72] {   polygon-fill: " + cssDictionary[2] + ";}#world_borders [ total_amount <= 1144718] {   polygon-fill:" + cssDictionary[3] + ";} #world_borders [ total_amount <= 400000] {   polygon-fill: " + cssDictionary[4] + ";}}";
		cssInitial_SubNat = "[zoom>3]{#subnat{  polygon-fill: "+polygonFillColor+";  polygon-opacity: 0.8;  line-color: "+borderColor+";  line-width: 1;  line-opacity: 1;}#subnat [ total_amount <= 118349410.5] {   polygon-fill:" + cssDictionary[0] + ";}#subnat [ total_amount <= 11477333] {   polygon-fill: " + cssDictionary[1] +";}#subnat [ total_amount <= 4490000] {   polygon-fill: " + cssDictionary[2] + ";}#subnat [ total_amount <= 1485000] {   polygon-fill: " + cssDictionary[3] + ";}#subnat [ total_amount <= 500000] {   polygon-fill: " + cssDictionary[4] + ";}}";
 
		var InitialCenter = new L.LatLng(40, 0);
		var map = L.map(divID, { zoomControl: false});
		var sublayers;

		if(query.indexOf(' && ') !== -1){
			var queriesObj = splitParam(query, delimiter);
			var queryInitial_Nat = queriesObj.natQuery;
			var queryInitial_SubNat = queriesObj.subnatQuery;
			sublayers = [
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
			];
		} else {
			sublayers = [
				{
					sql: query,
					cartocss: cssInitial_Nat,
					interactivity: 'cartodb_id, total_amount, locationname'
				}
			];
		}

		//setting private vars
		$container = $('#'+divID);

		// Create map
		map.setView(InitialCenter);
		map.fitBounds(L.latLngBounds(southWest, northEast));
		L.tileLayer('http://a.tiles.mapbox.com/v3/fordfoundation.370e1581/{z}/{x}/{y}.png', {
			attribution: ''
		}).addTo(map);
		cartodb.createLayer(map,
			{
				user_name: account_name,
				type: 'cartodb',
				sublayers: sublayers
			}
		)
		.addTo(map)
		.on('done', function(layer) {
			natsublayer= layer.getSubLayer(0); 
			subnatsublayer= layer.getSubLayer(1); 
			natsublayer.setInteraction(true);
			subnatsublayer.setInteraction(true);

			natsublayer.on('featureOver', function (e, pos, latlng, national_data){
				natFeatureOver(e, pos, latlng, national_data);
			});

			subnatsublayer.on('featureOver', function(e, pos, latlng, subnational_data) {
				var queryForNational = layer.layers[0].options.sql.replace(" where ", " where l.locationname='"+subnational_data.country+"' and ");
				subNatFeatureOver(e, pos, latlng, subnational_data, queryForNational);
			});
        });


		// Create info box
		$('<div class="info"></div>').appendTo($container).mousemove(function(event){event.stopImmediatePropagation()});
	};
 	var natFeatureOver = function (e, pos, latlng, data){
		var value= data.total_amount;
		$container.children('.info').html("<div><p><strong>" + data.locationname +"</strong></p><p>$"+value.toFixed(2)+"</p></div>");
    };
	var subNatFeatureOver = function (e, pos, latlng, subnational_data, queryForNational){
		var subnational_total= subnational_data.total_amount;
		var national_total;
		var subNationalName = subnational_data.locationname;
		var nationalName = subnational_data.country;
		$.getJSON('http://'+account_name+'.cartodb.com/api/v2/sql/?q='+queryForNational, function(national_data) {
			$container.children('.info').html( 
				"<div>"+
					"<p><strong>" + subNationalName +"</strong></p>"+
					"<p>$"+subnational_total.toFixed(2)+"</p>"+
				"</div>"
			);
			national_total = national_data.rows[0].total_amount;
			var percentage = (subnational_total / national_total)*100;
			$container.children('.info').append(
				"<div><p><strong>" + nationalName + "</strong></p><p>$"+national_total.toFixed(2)+"</p></div>" + 
				"<div><p><strong>% of national total:</strong></p><p>"+percentage.toFixed(2)+"%</p></div>" +
				"<div class='chart'></div>"
			);
			createDonnutChart(subnational_total,national_total);
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