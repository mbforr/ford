function cartoMap(query, divId) { 
     var cssDictionary = ['#006D2C', '#2CA25F', '#66C2A4', '#B2E2E2', '#EDF8FB'];// color ramp
 
     // initial cartoCSS for National and Subnational levels
     var cssInitial_Nat = "[zoom<=3]{#world_borders{  polygon-fill: #EDF8FB;  polygon-opacity: 0.8;  line-color: #FFF;  line-width: 1;  line-opacity: 1;}#world_borders [ total_amount <= 1781668262.38] {   polygon-fill: " + cssDictionary[0] + ";}#world_borders [ total_amount <= 31403245] {   polygon-fill:" + cssDictionary[1] + ";}#world_borders [ total_amount <= 3713003.72] {   polygon-fill: " + cssDictionary[2] + ";}#world_borders [ total_amount <= 1144718] {   polygon-fill:" + cssDictionary[3] + ";} #world_borders [ total_amount <= 400000] {   polygon-fill: " + cssDictionary[4] + ";}}";
     var cssInitial_SubNat = "[zoom>3]{#subnat{  polygon-fill: #EDF8FB;  polygon-opacity: 0.8;  line-color: #FFF;  line-width: 1;  line-opacity: 1;}#subnat [ total_amount <= 118349410.5] {   polygon-fill:" + cssDictionary[0] + ";}#subnat [ total_amount <= 11477333] {   polygon-fill: " + cssDictionary[1] +";}#subnat [ total_amount <= 4490000] {   polygon-fill: " + cssDictionary[2] + ";}#subnat [ total_amount <= 1485000] {   polygon-fill: " + cssDictionary[3] + ";}#subnat [ total_amount <= 500000] {   polygon-fill: " + cssDictionary[4] + ";}}";
 
       this.id = divId;
       this.createMap = function () {
 
			var InitialCenter = new L.LatLng(40, 0);
			this.map = L.map(this.id, { zoomControl: false});
			this.map.setView(InitialCenter, 3);
			this.splitParam = function(param, delimiter){
				var ix = param.indexOf(delimiter);
				var param1 = param.substring(0,ix);
				var param2 = param.substring(ix + delimiter.length, param.length);
				return {natQuery:param1, subnatQuery:param2};
			}
	 		var queriesObj = this.splitParam(query, " && ");
			var queryInitial_Nat = queriesObj.natQuery;
			var queryInitial_SubNat = queriesObj.subnatQuery;

			L.tileLayer('http://a.tiles.mapbox.com/v3/fordfoundation.370e1581/{z}/{x}/{y}.png', {
			attribution: ''
			}).addTo(this.map);

			cartodb.createLayer(this.map,
				{
					user_name: CARTO_MAP.account_name,
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
			).addTo(this.map);
       };
 
       this.createMap();
};