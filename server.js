var http = require('http');
var querystring = require('querystring');
const crypto = require('crypto');
const fs = require('fs');
var devid='';																						//Device id : Which is send from the board
var validDeviceId = ['RPI1', 'RPI2', 'RPI3', 'RPI4', 'RPI5', 'RPI6'];	// List of Valid device IDs 
var key='ed02457b5c41d964dbd2f2a609d63fe1bb7528dbe55e1abf5b52c249cd735797';	
var tempkey = '';
var lastkey = '';
var keystr= 'aaa';

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

var jfile = fs.readFileSync("devices.json", "utf8");
datalist = JSON.parse(jfile);  //deviceid" : "RPI5","key","keystrng"

function handleRequest(request, response){
    //response.end('\nServer working properly. Requested URL :' + request.url);
    
    request.on('data', function (data)										
	{			
		jsonParsed = JSON.parse(data); 															//Json parsed data recieved from the client
		devid = jsonParsed.DevId; 
		pktno = jsonParsed.PacketNo;
		console.log('\nRecieved Packet Number : '+pktno+'  || Device-ID : '+"'"+devid+"'\n");       
		if(validDeviceId.indexOf(jsonParsed.DevId) != -1)												//datalist.deviceid==jsonParsed.DevId)		//		if(datalist.hasOwnProperty('devid')!=-1)//							//returns  the index if match is found returns -1 if match is not found
		{	
			if(dataStore[devid]== undefined || dataStore[devid].data1=='')
			{
				dataStore[devid ]= new Object();												//creates a new object only once when data is rceved fro a new device.			
				dataStore[devid].data1 = jsonParsed.Sdata+jsonParsed.TimeS+jsonParsed.RSSI;
				dataStore[devid].dhash1=jsonParsed.SHA256Hash;
				dataStore[devid].pktno=jsonParsed.PacketNo;
				dataStore[devid].keystr=datalist[devid]["keystring"]
				dataStore[devid].hashkey=datalist[devid]["key"]
				console.log('Data-1 : '+dataStore[devid].data1);
				console.log('Data-1 hash: '+dataStore[devid].dhash1);
				if(dataStore[devid].dhash1==crypto.createHash('sha256').update(dataStore[devid].hashkey+dataStore[devid].data1).digest('hex'))
				{
					tempkey=keygenerator();
					testpktno=jsonParsed.PacketNo;
					console.log('\n1st Key generated : '+tempkey+'\n\n');
					response.writeHead(200, { 'Content-Type': 'text/plain'});
					response.end('Hello Node.js Server has recived the first data, '+tempkey);
				}
			}
			else
			{
				if(testpktno+1==pktno && pktno%5!=0)
				{
					dataStore[devid].data2 = jsonParsed.Sdata+jsonParsed.TimeS+jsonParsed.RSSI;
					dataStore[devid].dhash2=jsonParsed.SHA256Hash;
					//dataStore[devid].concdata = dataStore[devid].data1 + dataStore[devid].data2;

					//console.log('Data1: '+dataStore[devid].data1);
					console.log('Data: '+dataStore[devid].data2);

					tempkey=keygenerator();
					feed=dataStore[devid].hashkey+dataStore[devid].data2+dataStore[devid].dhash1;
					//console.log('\nCdata : '+feed);
					//console.log('Recieved-hash: '+dataStore[devid].dhash2);
					console.log('\nNew key generated '+tempkey);
					console.log('Key used to hash :'+dataStore[devid].hashkey);
					dataStore[devid].Servhash=crypto.createHash('sha256').update(feed).digest('hex');
						
					console.log('\nServer Hash : '+dataStore[devid].Servhash);
					console.log('Client Hash : '+dataStore[devid].dhash2);
					if(dataStore[devid].Servhash==dataStore[devid].dhash2)
					{
						testpktno=jsonParsed.PacketNo;
						console.log('\n\t\tData Validated\n');
						console.log('*****************************************************************************\n');
						fs.appendFile('Valid.txt',sl1+'\t  '+devid+'     |'+pktno+'|\t\t'+dataStore[devid].data1+'\t'+dataStore[devid].dhash1+'\n' , (err) =>
						{ 
							if (err) throw err;
							sl1+=1;
						});
						dataStore[devid].dhash1=dataStore[devid].dhash2;
						dataStore[devid].data1=dataStore[devid].data2;
						response.writeHead(200, { 'Content-Type': 'text/plain'});
						response.end('Data is validated : Block is added to the Chain, '+tempkey+'\n');
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
						tempkey=lastkey;
					}

					response.writeHead(200, { 'Content-Type': 'text/plain'});
					response.end('Server could not validate the packet : Block did not get added to the Chain, **CONTACT THE ADMINISTRATOR TO RESTART THE BLOCKCHAIN** ');
				}
				else if(testpktno+1==pktno && pktno%5==0)
				{
					lastkey=tempkey;
					tempkey=keygenerator();
					
					dataStore[devid].hashkey=crypto.createHash('sha256').update(dataStore[devid].hashkey+lastkey).digest('hex');
					dataStore[devid].data2 = jsonParsed.Sdata+jsonParsed.TimeS+jsonParsed.RSSI;
					dataStore[devid].dhash2=jsonParsed.SHA256Hash;
					//dataStore[devid].concdata = dataStore[devid].data1 + dataStore[devid].data2;	
					feed=dataStore[devid].hashkey+dataStore[devid].data2+dataStore[devid].dhash1;
					//console.log('Data1: '+dataStore[devid].data1);
					console.log('Data: '+dataStore[devid].data2);
					//console.log('\nCdata : '+feed);
					console.log('Recieved-hash: '+dataStore[devid].dhash2);
					console.log('\nNew key generated '+tempkey);
					console.log('Key used to hash :'+dataStore[devid].hashkey);
					dataStore[devid].Servhash=crypto.createHash('sha256').update(feed).digest('hex');

					console.log('\nServer Hash : '+dataStore[devid].Servhash);
					console.log('Client Hash : '+dataStore[devid].dhash2);
					if(dataStore[devid].Servhash==dataStore[devid].dhash2)
					{
						testpktno=jsonParsed.PacketNo;
						console.log('\n\t\tData Validated\n');
						console.log('*****************************************************************************\n\n');
						fs.appendFile('Valid.txt',sl1+'\t  '+devid+'     |'+pktno+'|\t\t'+dataStore[devid].data1+'\t'+dataStore[devid].dhash1+'\n' , (err) =>
						{ 
							if (err) throw err;
							sl1+=1;
						});

						dataStore[devid].dhash1=dataStore[devid].dhash2;
						dataStore[devid].data1=dataStore[devid].data2;
						response.writeHead(200, { 'Content-Type': 'text/plain'});
						response.end('Data is validated : Block is added to the Chain, '+tempkey+'\n');
					}
					else
					{
						console.log('\n\t      ----------------------------------------------------');
						console.log('\t******Invalid Packet :Block did not get added to the Chain******');
						console.log('\t      ----------------------------------------------------');
						tempkey=lastkey;
					}
					response.writeHead(200, { 'Content-Type': 'text/plain'});
					response.end('Server could not validate the packet : Block did not get added to the Chain, **CONTACT THE ADMINISTRATOR TO RESTART THE BLOCKCHAIN** ');	
				}
				else
				{
					console.log('\n\t      ----------------------------------------------------');
					console.log('\t******Invalid Packet :Block did not get added to the Chain******');
					console.log('\t      ----------------------------------------------------');
					response.writeHead(200, { 'Content-Type': 'text/plain'});
					response.end('Server could not validate the packet : Block did not get added to the Chain, **CONTACT THE ADMINISTRATOR TO RESTART THE BLOCKCHAIN** ');
				}			
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
			
			response.setHeader('Content-Type', 'text/html');
			response.writeHead(200, { 'Content-Type': 'text/plain'});
			response.end('Invalid Device  ID |Administrator will be notified, **CONTACT THE ADMINISTRATOR TO RESTART THE BLOCKCHAIN** ');
		}
							
	});
  
}

function keygenerator() 
{
    s= dataStore[devid].keystr;
	if(dataStore[devid].keystr!=='zzz') {
		dataStore[devid].keystr= ((parseInt(dataStore[devid].keystr, 36)+1).toString(36)).replace(/0/g,'a');
		s= ' '+dataStore[devid].keystr;
	}
	keystr=s
	return crypto.createHash('sha256').update(s).digest('hex');
} 

const server = http.createServer(handleRequest)


server.listen(PORT, () => {
  console.log('\tThe Blockchain Server has started \n\n The Server is listening on: http://localhost:%s\n', PORT);
});
