
/**
 * 官方样码：https://cloud.google.com/secret-manager/docs/samples/secretmanager-access-secret-version#secretmanager_access_secret_version-nodejs
 */

const {SecretManagerServiceClient} = require('@google-cloud/secret-manager');

const client = new SecretManagerServiceClient();

/**
 * full path: projects/665632270843/secrets/secret-test/versions/4
 * 665632270843 is the projectId
 * @param {string} projectId 
 */
function GoogleSecret(projectId) {
  this.mySecretProject = 'projects/' + projectId;
  this.mySecretProjectPath = this.mySecretProject + '/secrets';
}

GoogleSecret.prototype.createSecret = createSecret;
GoogleSecret.prototype.addSecretVersion = addSecretVersion;
GoogleSecret.prototype.accessSecretVersion = accessSecretVersion;
GoogleSecret.prototype.deleteSecret = deleteSecret;
GoogleSecret.prototype.getSecret = getSecret;
GoogleSecret.prototype.listSecrets = listSecrets;

/**
 * 创建一个名为secretId的密钥，设置其值需要使用addSecretVersion
 * @param {string} secretId https://console.cloud.google.com/security/secret-manager 页面的名称栏所表示的id
 */
async function createSecret(secretId) {
  const [secret] = await client.createSecret({
    parent: this.mySecretProject,
    secretId: secretId,
    secret: {
      replication: {
        automatic: {},
      },
    },
  });

  console.log(`Created secret ${secret.name}`);
}

/**
 * 添加一个secretStr到secretId所表示密钥中，版本自动递增1
 * @param {string} secretId https://console.cloud.google.com/security/secret-manager 页面的名称栏所表示的id
 * @param {string} secretStr 设定值
 */
async function addSecretVersion(secretId, secretStr) {
  const payload = Buffer.from(secretStr, 'utf8');
  const [version] = await client.addSecretVersion({
    parent: this.mySecretProjectPath + '/' + secretId,
    payload: {
      data: payload,
    },
  });
  console.log(`Added secret version ${version.name}`);
}

/**
 * 获取名为secretId的密钥的versionId对应的版本值
 * @param {string} secretId https://console.cloud.google.com/security/secret-manager 页面的名称栏所表示的id
 * @param {string} versionId 第几个版本, "latest" 表示最新版本，版本号最大的那个
 */
async function accessSecretVersion(secretId, versionId = 1) {
  try{
    const [version] = await client.accessSecretVersion({
      name: this.mySecretProjectPath + '/' + secretId + '/versions/' + versionId
    });
  
    let v = version.payload.data.toString();
    // console.info(`The secret version is: ${v}`);
    return v;
  } catch (e) {
    console.log("Google service Error: " + e.details)
  }
  
  return null;
}

/**
 * 删除名为secretId的密钥, 如： projects/my-project/secrets/my-secret 中的 my-secret
 * @param {string} secretId https://console.cloud.google.com/security/secret-manager 页面的名称栏所表示的id
 */
async function deleteSecret(secretId) {
  let name = this.mySecretProjectPath + '/' + secretId
  await client.deleteSecret({
    name: name,
  });

  console.log(`Deleted secret ${name}`);
}

/**
 * 查询是否有特定的secretId, 比如：projects/665632270843/secrets/mysecret-1
 * @param {string} secretId 
 */
async function getSecret(secretId) {
  try{
      const [secret] = await client.getSecret({
          name: this.mySecretProjectPath + '/' + secretId,
        });
      return secret && secret.name
  } catch(e) {
      return false;
  }
}

/**
 * 列出所有的secretId
 */
async function listSecrets() {
  try{
    const [secrets] = await client.listSecrets({
      parent: this.mySecretProject,
    });
    let arr = []
    let  prefix = this.mySecretProjectPath + "/"
    secrets.forEach(secret => {
      arr.push(secret.name.replace(prefix, ""));
    });
  
    return arr;
  } catch(e) {
    console.log("Error: Google service maybe not available, check your local cache version")
    return null;
  }
}

// createSecret('test1')
// addSecretVersion('test1', 'my super secret data');
// accessSecretVersion('test1', 1);
// deleteSecret('test1');
// getSecret('mysecret-1');
// listSecrets();

module.exports = GoogleSecret