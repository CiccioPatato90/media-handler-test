const express = require("express");
const Sharp = require("./sharp");
const {
  getBucketList,
  deleteBucketById,
  createBucket,
  cleanBuckets,
  getKeyList,
  createKey,
  deleteKey,
  inspectBucket,
  initializeMinioClients,
} = require("./garageAdmin");
const { mainRBAC } = require("./rbac");
const { object, string, safeParse } = require("valibot");
const app = express();
const PORT = process.env.PORT || 3000;

const supportedExtensions = {
  image: ["jpg", "jpeg", "png"],
  document: ["pdf", "doc", "docx", "xls", "xlsx", "csv"],
};

const accessModes = {
  read: "read",
  write: "write",
  delete: "delete",
  none: "none",
  selfAll: "selfAll",
  all: "all",
}
function buildAccessModes(accessModes){
  result=""
  for(mode of accessModes){
    result += mode + ",";
  }
  return result;
}
// const conceptIds = {
//   association: {
//     associationId: { cover: [], posts: { postId: { images: [] } } },
//     // posts: { postId: { images: [] } },
//   },
//   user: { userId: { cover: [] } },
//   request: {
//     association: { associationRequestId: { cover: [], docs: [] } },
//     inventory: { inventoryRequestId: { docs: [] } },
//     project: {
//       projectRequestId: {
//         cover: [],
//         revisions: { revisionId: { images: [], docs: [] } },
//         docs: [],
//         updates: { projectUpdateId: { images: [], docs: [] } },
//         images: [],
//       },
//     },
//   },
// };

function getFileType(inputFile) {
  const extension = inputFile.name.split(".").pop();
  console.log(extension);
  for (const [key, value] of Object.entries(supportedExtensions)) {
    if (value.includes(extension)) {
      return key;
    }
  }
  return null;
}

// Valibot validation schemas for each operation
const operationSchemas = {
  // Association entities
  associationCover: object({
    associationId: string(),
  }),
  associationPostsImages: object({
    associationId: string(),
    postId: string(),
  }),

  // User entities
  userCover: object({
    userId: string(),
  }),

  // AssociationRequest entities
  requestAssociationCover: object({
    associationRequestId: string(),
  }),
  requestAssociationDocs: object({
    associationRequestId: string(),
  }),

  // InventoryRequest entities
  requestInventoryDocs: object({
    inventoryRequestId: string(),
  }),

  // ProjectRequest entities
  requestProjectCover: object({
    projectRequestId: string(),
  }),
  requestProjectImages: object({
    projectRequestId: string(),
  }),
  requestProjectRevisionsImages: object({
    projectRequestId: string(),
    revisionId: string(),
  }),
  requestProjectRevisionsDocs: object({
    projectRequestId: string(),
    revisionId: string(),
  }),
  requestProjectDocs: object({
    projectRequestId: string(),
  }),
  requestProjectUpdateImages: object({
    projectRequestId: string(),
    projectUpdateId: string(),
  }),
  requestProjectUpdateDocs: object({
    projectRequestId: string(),
    projectUpdateId: string(),
  }),
};

// Helper function to validate and extract arguments
function validateAndExtractArgs(operation, inputData) {
  const schema = operationSchemas[operation];
  if (!schema) {
    throw new Error(`Unknown operation: ${operation}`);
  }

  const result = safeParse(schema, inputData);
  if (!result.success) {
    throw new Error(
      `Validation failed for operation ${operation}: ${result.issues
        .map((i) => i.message)
        .join(", ")}`
    );
  }

  return result.output;
}

const idBuilder = {
  // Association entities
  associationCover: (associationId) =>{
    return {
      id:  `association/${associationId}/cover/original`,
      bucket: "app-images",
      args: { associationId: associationId },
      rbac: {
        user: buildAccessModes([accessModes.read]),
        associationAdmin: buildAccessModes([accessModes.selfAll]),
        admin: buildAccessModes([accessModes.all]),
      }
    }
  },
  associationPostsImages: (associationId, postId) =>
    {
      return {
        id:  `association/${associationId}/posts/${postId}/images/original`,
        bucket: "app-images",
        args: { associationId: associationId, postId: postId },
        rbac: {
          user: buildAccessModes([accessModes.read]),
          associationAdmin: buildAccessModes([accessModes.selfAll]),
          admin: buildAccessModes([accessModes.all]),
        }
      }
    },
  // User entities
  userCover: (userId) => {
    return {
      id:  `user/cover/${userId}/original`,
      bucket: "app-images",
      args: { userId: userId },
      rbac: {
        user: buildAccessModes([accessModes.selfAll]),
        associationAdmin: buildAccessModes([accessModes.none]),
        admin: buildAccessModes([accessModes.all]),
      }
    }
  },

  // AssociationRequest entities
  requestAssociationCover: (associationRequestId) =>
    {
      return {
        id: `request/association/${associationRequestId}/cover/original`,
        bucket: "app-images",
        args: { associationRequestId: associationRequestId },
        rbac: {
          user: buildAccessModes([accessModes.none]),
          associationAdmin: buildAccessModes([accessModes.selfAll]),
          admin: buildAccessModes([accessModes.all]),
        }
      }
    },
  requestAssociationDocs: (associationRequestId) =>
    {
      return {
        id: `request/association/${associationRequestId}/docs`,
        bucket: "app-docs",
        args: { associationRequestId: associationRequestId },
        rbac: {
          user: buildAccessModes([accessModes.none]),
          associationAdmin: buildAccessModes([accessModes.selfAll]),
          admin: buildAccessModes([accessModes.all]),
        }
      }
    },
  // InventoryRequest entities
  requestInventoryDocs: (inventoryRequestId) =>
    {
      return {
        id: `request/inventory/${inventoryRequestId}/docs`,
        bucket: "app-images",
        args: { inventoryRequestId: inventoryRequestId },
        rbac: {
          user: buildAccessModes([accessModes.none]),
          associationAdmin: buildAccessModes([accessModes.selfAll]),
          admin: buildAccessModes([accessModes.all]),
        }
      }
    },
  // ProjectRequest entities
  requestProjectCover: (projectRequestId) =>
    {
      return {
        id: `request/project/${projectRequestId}/cover/original`,
        bucket: "app-images",
        args: { projectRequestId: projectRequestId },
        rbac: {
          user: buildAccessModes([accessModes.read]),
          associationAdmin: buildAccessModes([accessModes.selfAll]),
          admin: buildAccessModes([accessModes.all]),
        }
      }
    },
  requestProjectImages: (projectRequestId) =>
    {
      return {
        id: `request/project/${projectRequestId}/images/original`,
        bucket: "app-images",
        args: { projectRequestId: projectRequestId },
        rbac: {
          user: buildAccessModes([accessModes.read]),
          associationAdmin: buildAccessModes([accessModes.selfAll]),
          admin: buildAccessModes([accessModes.all]),
        }
      }
    },
  requestProjectRevisionsImages: (projectRequestId, revisionId) =>
    {
      return {
        id: `request/project/${projectRequestId}/revisions/${revisionId}/images/original`,
        bucket: "app-images",
        args: { projectRequestId: projectRequestId, revisionId: revisionId },
        rbac: {
          user: buildAccessModes([accessModes.read]),
          associationAdmin: buildAccessModes([accessModes.selfAll]),
          admin: buildAccessModes([accessModes.all]),
        }
      }
    },
  requestProjectRevisionsDocs: (projectRequestId, revisionId) =>
    {
      return {
        id: `request/project/${projectRequestId}/revisions/${revisionId}/docs`,
        bucket: "app-images",
        args: { projectRequestId: projectRequestId, revisionId: revisionId },
        rbac: {
          user: buildAccessModes([accessModes.none]),
          associationAdmin: buildAccessModes([accessModes.selfAll]),
          admin: buildAccessModes([accessModes.all]),
        }
      }
    },
  requestProjectDocs: (projectRequestId) =>
    {
      return {
        id: `request/project/${projectRequestId}/docs`,
        bucket: "app-images",
        args: { projectRequestId: projectRequestId },
        rbac: {
          user: buildAccessModes([accessModes.none]),
          associationAdmin: buildAccessModes([accessModes.selfAll]),
          admin: buildAccessModes([accessModes.all]),
        }
      }
    },
  requestProjectUpdateImages: (projectRequestId, projectUpdateId) =>
  {
    return {
      id: `request/project/${projectRequestId}/updates/${projectUpdateId}/images/original`,
      bucket: "app-images",
      args: { projectRequestId: projectRequestId, projectUpdateId: projectUpdateId },
      rbac: {
        user: buildAccessModes([accessModes.read]),
        associationAdmin: buildAccessModes([accessModes.all]),
        admin: buildAccessModes([accessModes.all]),
      }
    }
  },
  requestProjectUpdateDocs: (projectRequestId, projectUpdateId) =>{
   return {
    id: `request/project/${projectRequestId}/updates/${projectUpdateId}/docs`,
    bucket: "app-docs",
    args: { projectRequestId: projectRequestId, projectUpdateId: projectUpdateId },
    rbac: {
      user: buildAccessModes([accessModes.read]),
      associationAdmin: buildAccessModes([accessModes.all]),
      admin: buildAccessModes([accessModes.all]),
    }
   }
  }
};

// key starts at null, since we set it as startup
s3_config = {
  buckets: [
    {
      name: "app-images",
      id: null,
      key: {
        id: null,
        name: "app-images-key",
      },
      minioClient: null,
    },
    {
      name: "app-docs",
      id: null,
      key: {
        id: null,
        name: "app-docs-key",
      },
    },
    {
      name: "app-tmp",
      id: null,
      key: {
        id: null,
        name: "app-tmp-key",
      },
    },
    {
      // will be renamed to geo
      // and geo-key as key name
      name: "docs",
      id: null,
      key: {
        id: null,
        name: "docs_key",
      },
    },
  ],
};

async function initializeMediaHandler() {
  // initialize the media handler
  // 1. we want to know which buckets are available
  const bucketList = await getBucketList();
  // console.log("Bucket list: ", bucketList);

  // const createKeyResult = await createKey("test-key");
  // console.log("Create key result: ", createKeyResult);
  const keyList = await getKeyList();
  // console.log("Key list: ", keyList);
  if (false) {
    for (const key of keyList) {
      if (key.name != "docs_key") {
        console.log("Deleting key: ", key.id);
        await deleteKey(key.id);
      }
    }
  }

  // assign the key to the in memory bucket registry
  for (const bucket of s3_config.buckets) {
    // find in key list
    const bucketKey = keyList.find((key) => key.name === bucket.key.name);
    if (bucketKey && bucket.key.id == null) {
      bucket.key = bucketKey;
    }

    // find id of bucket in bucketList
    // if not found, means that we have to create it
    const foundBucket = bucketList.find((bucketEntity) => {
      return bucketEntity.globalAliases.find((alias) => alias === bucket.name);
    });
    if (foundBucket && bucket.id == null) {
      // console.log("Bucket entity found: ", foundBucket);
      bucket.id = foundBucket.id;
    }
  }

  // now the s3 config holds a null id for a key, if the key has to be created
  // ATTENTION: we first create the keys and then we assign them to the buckets


  // now we need consolidation loop
  for (const bucket of s3_config.buckets) {

    if(bucket.key.id == null) {
      console.log("create key for bucket: ", bucket.key.name);
      // if the key does not have an id, we need to create it
      const createKeyResult = await createKey(bucket.key.name);
      bucket.key = createKeyResult;
    }
    if (bucket.id == null) {
      console.log("create bucket for bucket: ", bucket.name);
      // if the bucket does not have an id, we need to create it
      // assigning to it the newly created key for that bucket
      const createResult = await createBucket(bucket.name, bucket.key.id);
      bucket.id = createResult.id;
    }
  }

  // now the structure is ready, we have the buckets populated with name and id
  // each of them has a key object associated with it for read, write, owner permissions

  await initializeMinioClients(s3_config);
  // console.log("S3 config: ", s3_config);
  // prova = "docs"
  // const buck = s3_config.buckets.find((bucket) => bucket.name === prova);
  // inspectBucket(buck.minioClient, prova, "");
}

app.use(express.json());
// Upload endpoint
app.get("/upload", async (req, res) => {
  // suppose we get a file here.

  let inputFile = {
    id: "123",
    name: "test.jpg",
    size: 10000,
    operation: "requestProjectUpdateImages",
    projectRequestId: "req_123", // Add the required argument
    projectUpdateId: "update_123", // Add the required argument
  };

  // first thing we need to do is to check whether it's a doc or an image
  const fileType = getFileType(inputFile);
  // console.log("fileType: ", fileType);
  if (!fileType) {
    return res.status(400).json({ error: "Unsupported file type" });
  }
  switch (fileType) {
    case "image":
      // start with image processing
      // 1. validate and extract arguments
      try {
        const validatedArgs = validateAndExtractArgs(
          inputFile.operation,
          inputFile
        );
        // console.log("Validated arguments: ", validatedArgs);

        // 2. build the path using the validated arguments
        const idBuilderFunction = idBuilder[inputFile.operation];
        const directions = idBuilderFunction(...Object.values(validatedArgs));
        directions.operation = inputFile.operation;
        console.log("Generated path direction: ", directions);

        // 3. check authorization for user, operation
        // access mode is always write since we are uploading
        const rbacResult = await mainRBAC(directions, accessModes.write);
        if (!rbacResult) {
          return res.status(403).json({ error: "Unauthorized" });
        }else{
          console.log("Uploading file");
        }
        // 3. convert to webp
      } catch (error) {
        // validation errors get caught here
        return res.status(400).json({ error: error.message });
      }
      break;
    case "document":
      // start with document processing
      break;
  }
});

// Download endpoint
app.get("/download", (req, res) => {
  res.json({ message: "Download endpoint - not implemented yet" });
});

// List endpoint
app.get("/list", async (req, res) => {
  try {
    const bucketList = await getBucketList();
    res.json({ buckets: bucketList });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to get bucket list", details: error.message });
  }
});

// Delete endpoint
app.get("/delete", (req, res) => {
  res.json({ message: "Delete endpoint - not implemented yet" });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, async () => {
  await initializeMediaHandler();
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

module.exports = app;
