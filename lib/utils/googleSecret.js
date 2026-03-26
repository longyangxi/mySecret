
/**
 * 官方样码：https://cloud.google.com/secret-manager/docs/samples/secretmanager-access-secret-version#secretmanager_access_secret_version-nodejs
 */

const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const colors = require('colors');

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
 * @param {string} secretId
 */
async function createSecret(secretId) {
  try {
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
    return secret.name;
  } catch (e) {
    console.error(colors.red(`Error creating secret "${secretId}": ${e.message}`));
    throw e;
  }
}

/**
 * 添加一个secretStr到secretId所表示密钥中，版本自动递增1
 * @param {string} secretId
 * @param {string} secretStr 设定值
 */
async function addSecretVersion(secretId, secretStr) {
  try {
    const payload = Buffer.from(secretStr, 'utf8');
    const [version] = await client.addSecretVersion({
      parent: this.mySecretProjectPath + '/' + secretId,
      payload: {
        data: payload,
      },
    });
    console.log(`Added secret version ${version.name}`);
    return version.name;
  } catch (e) {
    console.error(colors.red(`Error adding secret version for "${secretId}": ${e.message}`));
    return null;
  }
}

/**
 * 获取名为secretId的密钥的versionId对应的版本值
 * @param {string} secretId
 * @param {string} versionId 第几个版本, "latest" 表示最新版本
 */
async function accessSecretVersion(secretId, versionId = 1) {
  try {
    const [version] = await client.accessSecretVersion({
      name: this.mySecretProjectPath + '/' + secretId + '/versions/' + versionId
    });

    return version.payload.data.toString();
  } catch (e) {
    console.error(colors.red(`Error accessing secret "${secretId}" version ${versionId}: ${e.message}`));
    return null;
  }
}

/**
 * 删除名为secretId的密钥
 * @param {string} secretId
 */
async function deleteSecret(secretId) {
  try {
    const name = this.mySecretProjectPath + '/' + secretId;
    await client.deleteSecret({ name });
    console.log(`Deleted secret ${name}`);
    return name;
  } catch (e) {
    console.error(colors.red(`Error deleting secret "${secretId}": ${e.message}`));
    return null;
  }
}

/**
 * 查询是否有特定的secretId
 * @param {string} secretId
 */
async function getSecret(secretId) {
  try {
    const [secret] = await client.getSecret({
      name: this.mySecretProjectPath + '/' + secretId,
    });
    return secret && secret.name;
  } catch (e) {
    return false;
  }
}

/**
 * 列出所有的secretId
 */
async function listSecrets() {
  try {
    await client.getProjectId();
    const [secrets] = await client.listSecrets({
      parent: this.mySecretProject,
    });
    const arr = [];
    const prefix = this.mySecretProjectPath + "/";
    secrets.forEach(secret => {
      arr.push(secret.name.replace(prefix, ""));
    });
    return arr;
  } catch (e) {
    console.error(colors.red("Error: Google service not available — " + e.message));
    return null;
  }
}

module.exports = GoogleSecret
