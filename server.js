var http = require('http');
var querystring = require('querystring');
const crypto = require('crypto');
var devid='';																						//Device id : Which is send from the board
var validDeviceId = ['RPI1', 'RPI2', 'RPI3', 'RPI4', 'RPI5', 'RPI6'];								// List of Valid device IDs 
var dataStore = new  Object();
  
http.createServer(function(request, response)
{
    request.on('data', function (data)										
        {			
            jsonParsed = JSON.parse(data); 															//Json parsed data recieved from the client
            devid = jsonParsed.DevId; 
            console.log('\nThis data is recieved from Device : '+"'"+devid+"'"+', Recieved Packet Number : '+jsonParsed.PacketNo);       
            if(validDeviceId.indexOf(jsonParsed.DevId) != -1)										//returns  the index if match is found returns -1 if match is not found
			{	
				if(dataStore[devid]== undefined || dataStore[devid].data1=='')
				{
					dataStore[devid ]= new Object();												//creates a new object only once when data is rceved fro a new device.			
					dataStore[devid].data1 = jsonParsed.Sdata+jsonParsed.TimeS+jsonParsed.RSSI;
					dataStore[devid].dhash1=jsonParsed.SHA256Hash;
					console.log('\nData-1: '+dataStore[devid].data1);
					response.writeHead(200, { 'Content-Type': 'text/plain'});
					response.end('Hello Node.js Server has recived the data')
					//response.end();
				}
				else
				{
					//lastvalidpacket=dataStore[devid].data1;
					dataStore[devid].data2 = jsonParsed.Sdata+jsonParsed.TimeS+jsonParsed.RSSI;
					dataStore[devid].dhash2=jsonParsed.SHA256Hash;
					
					console.log('\nData1: '+dataStore[devid].data1);
					console.log('Data2: '+dataStore[devid].data2);
					
					dataStore[devid].concdata = dataStore[devid].data1 + dataStore[devid].data2;					
					
					dataStore[devid].Servhash=crypto.createHash('sha256').update(dataStore[devid].concdata).digest('hex');
					
					console.log('Composed-Data : '+dataStore[devid].concdata);
					console.log('\nServer Hash : '+dataStore[devid].Servhash);
					console.log('Client Hash : '+dataStore[devid].dhash1);
					if(dataStore[devid].Servhash==dataStore[devid].dhash1)
					{
						console.log('\n\t\tData Validated');
						dataStore[devid].dhash1=dataStore[devid].dhash2;
						dataStore[devid].data1=dataStore[devid].data2;
					}
					else
					{
						//dataStore[devid].data2=lastvalidpacket;
						console.log('\n\t      ----------------------------------------------------');
						console.log('\t******Invalid Packet :Block did not get added to the Chain******');
						console.log('\t      ----------------------------------------------------');
					}
					response.setHeader('Content-Type', 'text/html');
					response.writeHead(200, { 'Content-Type': 'text/plain'});
					response.end('Server has received the message');
					
				/*	response.writeHead(200, { 'Content-Type': 'text/plain','Trailer': 'Server-Message' });
					response.addTrailers({ 'Server-Message': 'Ok' });
					response.end();  */
				}
			} 					
			else
			{
				console.log('\n\t#####################################################');
				console.log('\t# Data Recieved  from an Invalid Device ID -> '+ '"'+devid+'"'+' #');
				console.log('\t#####################################################');		
				
				response.setHeader('Content-Type', 'text/html');
				response.writeHead(200, { 'Content-Type': 'text/plain'});
				response.end('Invalid Device  ID |Administrator will be notified');
				
				
				/*const body = 'hello world';
				response.writeHead(200, body ,{'Content-Length': Buffer.byteLength(body),'Content-Type': 'text/plain' });

				
				var message = 'Invalid Device ID';
				response.writeHead(400, message, {'content-type' : 'text/plain'});
				response.end(message);   
				
				response.writeHead(400, { 'Content-Type': 'text/plain','Trailer': 'Server-Message' });
                response.addTrailers({ 'Server-Message': 'Invalid Device ID' });
				response.end();	*/
			}
							 
        });
  

}).listen(5555);
