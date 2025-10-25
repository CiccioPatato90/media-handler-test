var garage = require("garage_administration_api");
var Minio = require("minio");

var tokens = {
  admin: "sq61FQd0TAUJX7hi6w0cbdWEKzpWHbmsM2/laIHlSiM=",
  metrics: "trJRdHktYmFt3+WC0VI8RENIfwlXQZy7aQbuB9b8SJg=",
};
const endpoint = "http://100.110.176.14:3903";

const minioClient = new Minio.Client({
  // endPoint: '192.168.1.13',
  endPoint: "100.110.176.14",
  port: 3900,
  useSSL: false,
  region: "garage",
  accessKey: "GK5af52b005c82f4fd5655cd8a",
  secretKey: "67bead2bac9c8cbd944ae956847515a783672563ae4b168f0cff531144c054b4",
});

let minioClients = [];

var clients = {
  admin: () => {
    var defaultClient = garage.ApiClient.instance;
    defaultClient.basePath = endpoint;
    var bearerAuth = defaultClient.authentications["bearerAuth"];
    bearerAuth.accessToken = tokens.admin;
    return defaultClient;
  },
  metrics: () => {
    var defaultClient = garage.ApiClient.instance;
    defaultClient.basePath = endpoint;
    var bearerAuth = defaultClient.authentications["bearerAuth"];
    bearerAuth.accessToken = tokens.metrics;
    return defaultClient;
  },
  // minio: (accessKey, secretKey, bucketName, bucketId) => {
  //   return {
  //     bucketName: bucketName,
  //     bucketId: bucketId,
  //     minioClient: () => new Minio.Client({
  //       endPoint: endpoint,
  //       port: 3900,
  //       useSSL: false,
  //       region: "garage",
  //       accessKey: accessKey,
  //       secretKey: secretKey,
  //     })
  //   };
  // },
};

var apis = {
  accessKey: () => {
    return new garage.AccessKeyApi(clients.admin());
  },
  adminAPITokenApi: () => {
    return new garage.AdminAPITokenApi(clients.admin());
  },
  blockApi: () => {
    return new garage.BlockApi(clients.admin());
  },
  bucketApi: () => {
    return new garage.BucketApi(clients.admin());
  },
  bucketAliasApi: () => {
    return new garage.BucketAliasApi(clients.admin());
  },
  ClusterApi: () => {
    return new garage.ClusterApi(clients.admin());
  },
  ClusterLayoutApi: () => {
    return new garage.ClusterLayoutApi(clients.admin());
  },
  NodeApi: () => {
    return new garage.NodeApi(clients.admin());
  },
  SpecialEndpointsApi: () => {
    return new garage.SpecialEndpointsApi(clients.admin());
  },
  WorkerApi: () => {
    return new garage.WorkerApi(clients.admin());
  },
};

var registeredApis = {
  accessKey: apis.accessKey(),
  adminAPITokenApi: apis.adminAPITokenApi(),
  blockApi: apis.blockApi(),
  bucketApi: apis.bucketApi(),
  bucketAliasApi: apis.bucketAliasApi(),
  ClusterApi: apis.ClusterApi(),
  ClusterLayoutApi: apis.ClusterLayoutApi(),
  NodeApi: apis.NodeApi(),
  SpecialEndpointsApi: apis.SpecialEndpointsApi(),
  WorkerApi: apis.WorkerApi(),
};

async function initializeMinioClients (s3_config) {
  for (const bucket of s3_config.buckets) {
    const keyInfo = await getKeyInfo(bucket.key.id);
    // console.log("Key info for bucket: ", bucket.name, keyInfo);
    // bucket.minioClient = clients.minio(keyInfo.accessKeyId, keyInfo.secretAccessKey, bucket.name, bucket.id);
    bucket.minioClient = new Minio.Client({
      endPoint: "100.110.176.14",
      port: 3900,
      useSSL: false,
      region: "garage",
      accessKey: keyInfo.accessKeyId,
      secretKey: keyInfo.secretAccessKey,
    });
  }
}

async function getKeyList() {
  let accesKeyApi = registeredApis.accessKey;
  let keyList = await accesKeyApi.listKeys();
  return keyList;
}

/*
* Create a key in the garage
* @async
* @function
* @param {string} keyName - The name of the key to create.
* @returns {Promise<Object{
accessKeyId: string, created: string,name: string, expiration: date, expired: boolean,secretAccessKey: string,
 permissions: {}, buckets:[]}
*/
async function createKey(keyName) {
  // let accesKeyApi = registeredApis.accessKey;
  // let key = await accesKeyApi.createKey(keyName);
  // return key;
  const createKeyResult = await fetch(`${endpoint}/v2/CreateKey`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokens.admin}`,
    },
    body: JSON.stringify({
      name: keyName,
    }),
  }).then((response) => response.json());
  console.log("Create key result: ", await createKeyResult);
  return await createKeyResult;
}

async function deleteKey(keyId) {
  let accesKeyApi = registeredApis.accessKey;
  await accesKeyApi.deleteKey(keyId);
  return true;
  // const deleteKeyResult = await fetch(`${endpoint}/v2/DeleteKey`, {
  //   method: "DELETE",
  //   headers: {
  //     "Content-Type": "application/json",
  //     Authorization: `Bearer ${tokens.admin}`,
  //   },
  //   body: JSON.stringify({
  //     id: keyId,
  //   }),
  // }).then((response) => response.json());
  // return await deleteKeyResult;
}

async function getKeyInfo(keyId) {
  let accesKeyApi = registeredApis.accessKey;
  let opts = {
    id: keyId,
    showSecretKey: true,
  };
  let keyInfo = await accesKeyApi.getKeyInfo(opts);
  return keyInfo;
}

/**
 * Get the list of buckets from the registered API.
 * @async
 * @function
 * @returns {Promise<Array<{id: string, created: string, globalAliases: string[], localAliases: string[]}>>} - List of bucket objects.
 */
async function getBucketList() {
  let bucketApi = registeredApis.bucketApi;
  let bucketList = await bucketApi.listBuckets();
  return bucketList;
}

async function inspectBucket(minioClient, bucketName, prefix ="") {
  const data = [];
  const stream = minioClient.listObjects(bucketName, prefix, true);
  stream.on("data", function (obj) {
    data.push(obj);
  });
  stream.on("end", function () {
    console.log(data);
  });
  stream.on("error", function (err) {
    console.log(err);
  });
}

async function removeFromBucket(bucketName, prefix) {

  const objectsList = [];
  // List all object paths in bucket my-bucketname.
  const objectsStream = minioClient.listObjects(bucketName, prefix, true);

  objectsStream.on("data", function (obj) {
    objectsList.push(obj.name);
  });

  objectsStream.on("error", function (e) {
    console.log(e);
  });

  objectsStream.on("end", async () => {
    for (const object of objectsList) {
      console.log("Removing object: ", object);
      await minioClient.removeObject(bucketName, object);
    }
  });
}

async function deleteBucketById(bucketId) {
  try {
    let bucketApi = registeredApis.bucketApi;
    await bucketApi.deleteBucket(bucketId);
    // await removeFromBucket("docs", "address/");
    // const bucketInfo = await inspectBucket("docs");
    // console.log("Bucket info: ", bucketInfo);
    return true;
  } catch (error) {
    return false;
  }
}

async function getKeyList() {
  let keyList = await registeredApis.accessKey.listKeys();
  return keyList;
}

async function createBucket(bucketName, accessKeyId) {
  try {
    const createResult = await fetch(`${endpoint}/v2/CreateBucket`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokens.admin}`,
      },
      body: JSON.stringify({
        globalAlias: bucketName,
        localAlias: {
          accessKeyId: accessKeyId,
          alias: bucketName,
          allow: {
            read: true,
            write: true,
            owner: true,
          },
        },
      }),
    }).then((response) => response.json());
    console.log("Create result: ", await createResult);
    return await createResult;
  } catch (error) {
    throw new Error(`Error creating bucket ${bucketName}: ${error.message}`);
  }
}

async function cleanBuckets() {
  let bucketList = await getBucketList();
  for (const bucket of bucketList) {
    // await deleteBucketById(bucket.id);
    console.log("CLEAN BUCKETS: ", bucket);
  }
}

module.exports = {
  getBucketList,
  deleteBucketById,
  createBucket,
  cleanBuckets,
  getKeyList,
  createKey,
  deleteKey,
  inspectBucket,
  initializeMinioClients,
};

// main();
