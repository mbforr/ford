
function createDonnutChart(value, national_value){
  var chart = c3.generate({
	size: { height: 50, width: 60 },
	data: {
		columns: [
			['data1', value],
			['data2', national_value],
		],
		type : 'donut'
	},
	color: {
		pattern: ['#10AA33', '#fff']
	},
	donut: {
	  label: {
		show: false,
	  }
	},
	legend: { show: false },
	tooltip: { show: false }
  });
};//end createDonnutChart()

// populate initiative options:
var account_name = 'sgcm';
var sql_statement="SELECT name, id FROM initiatives order by name";
$.getJSON('http://'+account_name+'.cartodb.com/api/v2/sql/?q='+sql_statement, function(data) {
  $("#initiative").append(new Option('All', '*'));
  $.each(data.rows, function(key, val) {
	var text= val.name;
	$("#initiative").append(new Option(text, text));
  });        
});

// populate region selector:
var sql_statement="SELECT name, id FROM regions order by name";
$.getJSON('http://'+account_name+'.cartodb.com/api/v2/sql/?q='+sql_statement, function(data) {
  $.each(data.rows, function(key, val) {
	var text= val.name;
	$("#region").append(new Option(text, text));
	//$("#region option[value=Global]").prop("selected", "selected")
  });        
});

 function cartoMap() {
	var queryInitial_Nat="SELECT wb.the_geom_webmercator, wb.cartodb_id, sum(g.amount) as total_amount, l.locationname,  l.abbreviationcode FROM world_borders wb,  location l,  grants_locations gl,  grants g where wb.iso2=l.abbreviationcode and l.id=gl.locationid and gl.grantid=g.id and l.locationtype='Country' group by l.locationname, l.abbreviationcode, wb.the_geom_webmercator,wb.cartodb_id order by l.locationname";
	var queryInitial_SubNat="SELECT sn.the_geom_webmercator, sn.cartodb_id, sum(g.amount) as total_amount, sn.name_0 as country,l.locationname FROM subnat sn, location l,  grants_locations gl,  grants g where sn.name_1=l.locationname and l.id=gl.locationid and gl.grantid=g.id and l.locationtype not in ('Continent', 'Country', 'Logical Group', 'Part Of Continent', 'Part Of Globe', 'Part Of Country', 'Union Territory') group by l.locationname, sn.the_geom_webmercator,sn.cartodb_id order by l.locationname";
	
	var cssDictionary=['#006D2C','#2CA25F','#66C2A4','#B2E2E2','#EDF8FB'];// color ramp
	
	// initial cartoCSS for National and Subnational levels
	var cssInitial_Nat="[zoom<=3]{#world_borders{  polygon-fill: #EDF8FB;  polygon-opacity: 0.8;  line-color: #FFF;  line-width: 1;  line-opacity: 1;}#world_borders [ total_amount <= 1781668262.38] {   polygon-fill: "+cssDictionary[0]+";}#world_borders [ total_amount <= 31403245] {   polygon-fill:"+ cssDictionary[1]+";}#world_borders [ total_amount <= 3713003.72] {   polygon-fill: "+cssDictionary[2]+";}#world_borders [ total_amount <= 1144718] {   polygon-fill:"+ cssDictionary[3]+";} #world_borders [ total_amount <= 400000] {   polygon-fill: "+cssDictionary[4]+";}}";
	
	var cssInitial_SubNat="[zoom>3]{#subnat{  polygon-fill: #EDF8FB;  polygon-opacity: 0.8;  line-color: #FFF;  line-width: 1;  line-opacity: 1;}#subnat [ total_amount <= 118349410.5] {   polygon-fill:"+cssDictionary[0]+";}#subnat [ total_amount <= 11477333] {   polygon-fill: "+cssDictionary[1]+";}#subnat [ total_amount <= 4490000] {   polygon-fill: "+cssDictionary[2]+";}#subnat [ total_amount <= 1485000] {   polygon-fill: "+cssDictionary[3]+";}#subnat [ total_amount <= 500000] {   polygon-fill: "+cssDictionary[4]+";}}";
	
	var natsublayer, subnatsublayer; //cartoDB layers
	
	this.mapArr = [];
	this.layerArr = [];
	this.removeMap = function(divID, infodivID) {
		$('#'+infodivID).remove();
		$('#'+divID).remove();
	}
	this.createMap = function(divID, infodivID) {
		var num_maps = $('body > .map').length;
		divID += num_maps+1;
		infodivID += num_maps+1;
		$('<div class="map" id="'+divID+'"></div><br/>')
			.appendTo('body')
			.append('<div class="info" id="'+infodivID+'"></div>');

		var self = this;
		var InitialCenter = new L.LatLng(40, 0);
		var map = L.map(divID, { zoomControl: false});
		map.setView(InitialCenter, 3);

		L.tileLayer('http://a.tiles.mapbox.com/v3/fordfoundation.370e1581/{z}/{x}/{y}.png', {
		  attribution: ''
		}).addTo(map);

		// cartodb layer with 2 sublayers (national and subnational)
		cartodb.createLayer(map, {
		  user_name: account_name,
		  type: 'cartodb',
		  sublayers: [
			{
			  sql: queryInitial_Nat,
			  cartocss: cssInitial_Nat,
			  interactivity:'cartodb_id, total_amount, locationname'
			},
			{
			  sql: queryInitial_SubNat,
			  cartocss: cssInitial_SubNat,
			  interactivity:'cartodb_id, total_amount, locationname, country'
			}
		  ]
		})
		.addTo(map) 
		.on('done', function(layer) {
		  self.layerArr[divID] = layer;
          natsublayer= layer.getSubLayer(0); 
          subnatsublayer= layer.getSubLayer(1); 
          natsublayer.setInteraction(true)
          subnatsublayer.setInteraction(true);
          
          natsublayer.on('featureOver', function (e, pos, latlng, data){
			  natFeatureOver(e, pos, latlng, data, infodivID);
			});

          //subnatsublayer.on('featureOver', subNatFeatureOver);
          subnatsublayer.on('featureOver', function(e, pos, latlng, data) {
            var queryForSubnational = "SELECT sum(g.amount) as total_amount FROM location l,  grants_locations gl,  grants g where l.locationname='"+data.country+"' and l.id=gl.locationid and gl.grantid=g.id and l.locationtype='Country' group by l.locationname";
            subNatFeatureOver(e, pos, latlng, data, queryForSubnational, infodivID);
          });
          subnatsublayer.on('featureOut', cleanInfobox(infodivID));

        }).on('error', function() {
          console.log("some error occurred");
        });
        map.on('zoomend', function() {
          var zoomLevel= map.getZoom();
          console.log('zoomLevel: '+zoomLevel)
        });
		map.infodiv = infodivID;
		this.mapArr[divID] = map;
		return map;
	};
	this.getMap = function(divID) {
		if(!(divID in this.mapArr)) {
			return false;
		}
		return this.mapArr[divID];
	};
	
	this.getLayer = function(divID) {
		if(!(divID in this.layerArr)) {
			return false;
		}
		return this.layerArr[divID];
	};
	
	this.updateNatQuery = function(divID, query) {
		var mapLayer = this.getLayer(divID);
		mapLayer.getSubLayer(0).setSQL(query);
	};
	this.updateSubNatQuery = function(divID, query) {
		var mapLayer = this.getLayer(divID);
		mapLayer.getSubLayer(1).setSQL(query);
	};
	this.updateNatCSS = function(divID, css) {
		var mapLayer = this.getLayer(divID);
		mapLayer.getSubLayer(0).setCartoCSS(css);
	};
	this.updateSubNatCSS = function(divID, css) {
		var mapLayer = this.getLayer(divID);
		mapLayer.getSubLayer(1).setCartoCSS(css);
	};
	natFeatureOver = function (e, pos, latlng, data, infodivID){
			  var value= data.total_amount;
			  $('#' + infodivID).html("<div style='padding:5px'><p><strong>" + data.locationname +"</strong></p><p>$"+value.toFixed(2)+"</p></div>");
    };
	subNatFeatureOver = function (e, pos, latlng, data, queryForSubnational, infodivID){
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
          else{
            //console.log(data.locationname)
          }
          //getNationalValue(data.country,extraQueryForSubnational, function(national_value){
          
    };
	cleanInfobox = function(infodivID) {
		// code to empty infobox here
		//$('#'+ infodivID).html("");
	};
};