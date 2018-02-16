var http = require('http');
var querystring = require('querystring');
const crypto = require('crypto');
const fs = require('fs');
var devid='';																						//Device id : Which is send from the board
var validDeviceId = ['RPI1', 'RPI2', 'RPI3', 'RPI4', 'RPI5', 'RPI6'];								// List of Valid device IDs 
var dataStore = new  Object();
const PORT = process.env.PORT || 8080;
  
fs.writeFile('Valid.txt', '\t\t\t\tAccepted data\n\n'); 
fs.appendFile('Valid.txt', 'Sl.No.  Dev-ID    Pkt-No:\t\tData\t\t\t\tHash\n');
var sl1=0; 
fs.writeFile('Invalid.txt', '\t\t\t\tInvalid data\n\n'); 
fs.appendFile('Invalid.txt', 'Sl.No.  Dev-ID    Pkt-No:\t\t\tData\t\t\t\tHash\n');
var sl2=0;
fs.writeFile('Rouge.txt', '\t\t\t\tRouge Devices\n\n'); 
fs.appendFile('Rouge.txt', 'Sl.No.  Dev-ID    Pkt-No:\t\tData\t\t\t\t\tHash\n');
var sl3

function handleRequest(request, response){
    response.end('\nServer working properly. Requested URL :' + request.url);
    
    request.on('data', function (data)										
        {			
            jsonParsed = JSON.parse(data); 															//Json parsed data recieved from the client
            devid = jsonParsed.DevId; 
            pktno = jsonParsed.PacketNo;
            console.log('\nThis data is recieved from Device : '+"'"+devid+"'"+', Recieved Packet Number : '+pktno);       
            if(validDeviceId.indexOf(jsonParsed.DevId) != -1)										//returns  the index if match is found returns -1 if match is not found
			{	
				if(dataStore[devid]== undefined || dataStore[devid].data1=='')
				{
					dataStore[devid ]= new Object();												//creates a new object only once when data is rceved fro a new device.			
					dataStore[devid].data1 = jsonParsed.Sdata+jsonParsed.TimeS+jsonParsed.RSSI;
					dataStore[devid].dhash1=jsonParsed.SHA256Hash;
					console.log('\nData-1: '+dataStore[devid].data1);
					response.writeHead(200, { 'Content-Type': 'text/plain'});
					response.end('Hello Node.js Server has recived the data');
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
						fs.appendFile('Valid.txt',sl1+'\t  '+devid+'     |'+pktno+'|\t\t'+dataStore[devid].data1+'\t'+dataStore[devid].dhash1+'\n' , (err) =>
						{ 
							if (err) throw err;
							sl1+=1;
						});
						dataStore[devid].dhash1=dataStore[devid].dhash2;
						dataStore[devid].data1=dataStore[devid].data2;
					}
					else
					{
						fs.appendFile('Invalid.txt',sl2+'\t  '+devid+'     |'+pktno+'|\t\t'+dataStore[devid].data2+'\t'+dataStore[devid].dhash2+'\n' , (err) =>
						{ 
							if (err) throw err;
							sl2+=1;
						});
						console.log('\n\t      ----------------------------------------------------');
						console.log('\t******Invalid Packet :Block did not get added to the Chain******');
						console.log('\t      ----------------------------------------------------');
					}
					//response.setHeader('Content-Type', 'text/html');
					response.writeHead(200, { 'Content-Type': 'text/plain'});
					response.end('Server has received the message');
					
				/*	response.writeHead(200, { 'Content-Type': 'text/plain','Trailer': 'Server-Message' });
					response.addTrailers({ 'Server-Message': 'Ok' });
					response.end();  */
				}
			} 					
			else
			{
				fs.appendFile('Rouge.txt',sl3+'\t  '+devid+'     |'+pktno+'|\t\t'+jsonParsed.Sdata+jsonParsed.TimeS+jsonParsed.RSSI+'\t'+jsonParsed.SHA256Hash+'\n' , (err) =>
				{ 
					if (err) throw err;
						sl3+=1;
				});
				console.log('\n\t#####################################################');
				console.log('\t# Data Recieved  from an Invalid Device ID -> '+ '"'+devid+'"'+' #');
				console.log('\t#####################################################');		
				
				//response.setHeader('Content-Type', 'text/html');
				response.writeHead(200, { 'Content-Type': 'text/plain'});
				response.end('Invalid Device  ID |Administrator will be notified');
			}
							 
        });
  
}
//http.createServer(function(request, response)
const server = http.createServer(handleRequest)


server.listen(PORT, () => {
  console.log('Server listening on: http://localhost:%s', PORT);
});
