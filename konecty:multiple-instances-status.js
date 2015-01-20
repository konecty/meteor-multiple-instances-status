var collectionName = process.env.MULTIPLE_INSTANCES_COLLECTION_NAME || 'instances'
	defaultPingInterval = 5000; // 5s

var Intances = new Meteor.Collection(collectionName);

Intances._ensureIndex({_updatedAt: 1}, {expireAfterSeconds: 10});

InstanceStatus = {
	getCollection: function() {
		return Intances;
	},

	registerInstance: function(name, extraInformation) {
		if (InstanceStatus.id() == undefined) {
			return console.error('[multiple-instances-status] only can be called after Meteor.startup');
		}

		var now = new Date(),
			intance = {
				_id: InstanceStatus.id(),
				name: name,
				_createdAt: now,
				_updatedAt: now
			};

		if (extraInformation) {
			intance.extraInformation = extraInformation;
		};

		try {
			result = Intances.insert(intance);
			InstanceStatus.start();

			process.on('exit', InstanceStatus.onExit);

			return result;
		} catch (e) {
			return e;
		}
	},

	unregisterInstance: function() {
		try {
			result = Intances.remove({_id: InstanceStatus.id()});
			InstanceStatus.stop();

			process.removeListener('exit', InstanceStatus.onExit);

			return result;
		} catch (e) {
			return e;
		}
	},

	start: function(interval) {
		InstanceStatus.stop();

		interval = interval || defaultPingInterval;

		InstanceStatus.interval = Meteor.setInterval(function() {
			InstanceStatus.ping();
		}, interval);
	},

	stop: function(interval) {
		if (InstanceStatus.interval) {
			InstanceStatus.interval.close();
			delete InstanceStatus.interval;
		}
	},

	ping: function() {
		Intances.update({_id: InstanceStatus.id()}, {$set: {_updatedAt: new Date()}});
	},

	onExit: function() {
		InstanceStatus.unregisterInstance();
	},

	activeLogs: function() {
		Intances.find().observe({
			added: function(record) {
				var log = '[multiple-instances-status] Server connected: ' + record.name + ' - ' + record._id;
				if (record._id == InstanceStatus.id()) {
					log += ' (me)';
				}
				console.log(log.green);
			},
			removed: function(record) {
				var log = '[multiple-instances-status] Server disconnected: ' + record.name + ' - ' + record._id;
				console.log(log.red);
			}
		});
	},

	id: function() {}
};

Meteor.startup(function() {
	var ID = Random.id();

	InstanceStatus.id = function() {
		return ID;
	};
});