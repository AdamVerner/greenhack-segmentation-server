// peer connection
var pc = null;

// data channel
var dc = null, dcInterval = null;

function negotiate() {
    return pc.createOffer().then(function(offer) {
        return pc.setLocalDescription(offer);
    }).then(function() {
        // wait for ICE gathering to complete
        return new Promise(function(resolve) {
            if (pc.iceGatheringState === 'complete') {
                resolve();
            } else {
                function checkState() {
                    if (pc.iceGatheringState === 'complete') {
                        pc.removeEventListener('icegatheringstatechange', checkState);
                        resolve();
                    }
                }
                pc.addEventListener('icegatheringstatechange', checkState);
            }
        });
    }).then(function() {
        var offer = pc.localDescription;

        return fetch('/offer', {
            body: JSON.stringify({
                sdp: offer.sdp,
                type: offer.type,
            }),
            headers: { 'Content-Type': 'application/json'},
            method: 'POST'
        });
    }).then(function(response) {
        return response.json();
    }).then(function(answer) {
        return pc.setRemoteDescription(answer);
    }).catch(function(e) {
        alert(e);
    });
}

function start() {
    document.getElementById('start').style.display = 'none';

    pc = new RTCPeerConnection({sdpSemantics: 'unified-plan'});
    // connect video
    pc.addEventListener('track', function(evt) {
        document.getElementById('video').srcObject = evt.streams[0];
    });

    dc = pc.createDataChannel('chat', {});

    dc.onmessage = function(evt) {
        console.log('data = ' + evt.data);
        document.getElementById('current-object').innerText = evt.data;
    };

    dc.onopen = function() {
        dcInterval = setInterval(function() {
            dc.send('ping ');
        }, 100);
    };

    const constraints = {
        width: 512,
        height: 512,
        video: true
    };

    document.getElementById('media').style.display = 'block';

    navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
        stream.getTracks().forEach(function(track) {
            pc.addTrack(track, stream);
        });
        return negotiate();
    }, function(err) {
        alert('Could not acquire media: ' + err);
    });

}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
