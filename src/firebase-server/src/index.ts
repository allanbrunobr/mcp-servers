#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { initializeApp } from 'firebase/app';
import { applicationDefault, initializeApp as initializeAdminApp } from 'firebase-admin/app';
import { getSecurityRules } from 'firebase-admin/security-rules';
import { ProjectsClient } from '@google-cloud/resource-manager';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Firebase Admin
const adminApp = initializeAdminApp({
  credential: applicationDefault(),
});

// Initialize Resource Manager
const projectsClient = new ProjectsClient();

class FirebaseServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'firebase-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'sign_in',
          description: 'Sign in with email and password',
          inputSchema: {
            type: 'object',
            properties: {
              email: {
                type: 'string',
                description: 'User email',
              },
              password: {
                type: 'string',
                description: 'User password',
              },
            },
            required: ['email', 'password'],
          },
        },
        {
          name: 'sign_up',
          description: 'Create a new user account',
          inputSchema: {
            type: 'object',
            properties: {
              email: {
                type: 'string',
                description: 'User email',
              },
              password: {
                type: 'string',
                description: 'User password',
              },
              userData: {
                type: 'object',
                description: 'Additional user data to store',
              },
            },
            required: ['email', 'password'],
          },
        },
        {
          name: 'sign_out',
          description: 'Sign out the current user',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'get_document',
          description: 'Get a document from Firestore',
          inputSchema: {
            type: 'object',
            properties: {
              collection: {
                type: 'string',
                description: 'Collection name',
              },
              id: {
                type: 'string',
                description: 'Document ID',
              },
            },
            required: ['collection', 'id'],
          },
        },
        {
          name: 'set_document',
          description: 'Set a document in Firestore',
          inputSchema: {
            type: 'object',
            properties: {
              collection: {
                type: 'string',
                description: 'Collection name',
              },
              id: {
                type: 'string',
                description: 'Document ID',
              },
              data: {
                type: 'object',
                description: 'Document data',
              },
            },
            required: ['collection', 'id', 'data'],
          },
        },
        {
          name: 'query_collection',
          description: 'Query documents in a collection',
          inputSchema: {
            type: 'object',
            properties: {
              collection: {
                type: 'string',
                description: 'Collection name',
              },
              field: {
                type: 'string',
                description: 'Field to query',
              },
              operator: {
                type: 'string',
                description: 'Query operator (==, >, <, >=, <=)',
              },
              value: {
                type: 'string',
                description: 'Value to compare against',
              },
            },
            required: ['collection', 'field', 'operator', 'value'],
          },
        },
        {
          name: 'list_projects',
          description: 'List all Firebase projects',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'create_project',
          description: 'Create a new Firebase project',
          inputSchema: {
            type: 'object',
            properties: {
              projectId: {
                type: 'string',
                description: 'Unique project ID',
              },
              displayName: {
                type: 'string',
                description: 'Display name for the project',
              },
            },
            required: ['projectId', 'displayName'],
          },
        },
        {
          name: 'configure_hosting',
          description: 'Configure Firebase Hosting for a project',
          inputSchema: {
            type: 'object',
            properties: {
              projectId: {
                type: 'string',
                description: 'Project ID',
              },
              site: {
                type: 'string',
                description: 'Hosting site name',
              },
            },
            required: ['projectId', 'site'],
          },
        },
        {
          name: 'update_security_rules',
          description: 'Update Firestore security rules',
          inputSchema: {
            type: 'object',
            properties: {
              projectId: {
                type: 'string',
                description: 'Project ID',
              },
              rules: {
                type: 'string',
                description: 'Security rules in string format',
              },
            },
            required: ['projectId', 'rules'],
          },
        },
        {
          name: 'deploy_function',
          description: 'Deploy a Cloud Function',
          inputSchema: {
            type: 'object',
            properties: {
              projectId: {
                type: 'string',
                description: 'Project ID',
              },
              functionName: {
                type: 'string',
                description: 'Function name',
              },
              sourceCode: {
                type: 'string',
                description: 'Function source code',
              },
              trigger: {
                type: 'object',
                description: 'Function trigger configuration',
              },
            },
            required: ['projectId', 'functionName', 'sourceCode', 'trigger'],
          },
        },
        {
          name: 'get_project_config',
          description: 'Get Firebase project configuration',
          inputSchema: {
            type: 'object',
            properties: {
              projectId: {
                type: 'string',
                description: 'Project ID',
              },
            },
            required: ['projectId'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'sign_in': {
            const { email, password } = request.params.arguments as {
              email: string;
              password: string;
            };
            const userCredential = await signInWithEmailAndPassword(
              auth,
              email,
              password
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      uid: userCredential.user.uid,
                      email: userCredential.user.email,
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          case 'sign_up': {
            const { email, password, userData } = request.params.arguments as {
              email: string;
              password: string;
              userData?: Record<string, any>;
            };
            const userCredential = await createUserWithEmailAndPassword(
              auth,
              email,
              password
            );

            if (userData) {
              await setDoc(
                doc(db, 'users', userCredential.user.uid),
                userData
              );
            }

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      uid: userCredential.user.uid,
                      email: userCredential.user.email,
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          case 'sign_out': {
            await signOut(auth);
            return {
              content: [
                {
                  type: 'text',
                  text: 'Successfully signed out',
                },
              ],
            };
          }

          case 'get_document': {
            const { collection: collectionName, id } = request.params
              .arguments as {
              collection: string;
              id: string;
            };
            const docRef = doc(db, collectionName, id);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
              throw new McpError(
                ErrorCode.InvalidRequest,
                'Document does not exist'
              );
            }

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(docSnap.data(), null, 2),
                },
              ],
            };
          }

          case 'set_document': {
            const {
              collection: collectionName,
              id,
              data,
            } = request.params.arguments as {
              collection: string;
              id: string;
              data: Record<string, any>;
            };
            await setDoc(doc(db, collectionName, id), data);
            return {
              content: [
                {
                  type: 'text',
                  text: 'Document successfully written',
                },
              ],
            };
          }

          case 'query_collection': {
            const {
              collection: collectionName,
              field,
              operator,
              value,
            } = request.params.arguments as {
              collection: string;
              field: string;
              operator: string;
              value: string;
            };
            const q = query(
              collection(db, collectionName),
              where(field, operator as any, value)
            );
            const querySnapshot = await getDocs(q);
            const results = querySnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(results, null, 2),
                },
              ],
            };
          }

          case 'list_projects': {
            const [projects] = await projectsClient.searchProjects();
            const firebaseProjects = projects.filter((project) => 
              project.labels && project.labels['firebase'] === 'enabled'
            );
            
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(firebaseProjects.map(p => ({
                  projectId: p.projectId,
                  displayName: p.displayName,
                  state: p.state
                })), null, 2)
              }]
            };
          }

          case 'create_project': {
            const { projectId, displayName } = request.params.arguments as {
              projectId: string;
              displayName: string;
            };

            const [operation] = await projectsClient.createProject({
              project: {
                projectId,
                displayName,
                labels: { 'firebase': 'enabled' }
              }
            });

            await operation.promise();

            return {
              content: [{
                type: 'text',
                text: `Project ${projectId} created successfully`
              }]
            };
          }

          case 'configure_hosting': {
            const { projectId, site } = request.params.arguments as {
              projectId: string;
              site: string;
            };

            // Firebase Hosting is not directly supported in admin SDK
            // You would typically use the Firebase CLI for this
            throw new McpError(
              ErrorCode.InternalError,
              'Firebase Hosting configuration requires Firebase CLI'
            );
          }

          case 'update_security_rules': {
            const { projectId, rules } = request.params.arguments as {
              projectId: string;
              rules: string;
            };

            // For now, we'll throw an error since security rules updates
            // require Firebase CLI or direct REST API calls
            throw new McpError(
              ErrorCode.InternalError,
              'Security rules updates require Firebase CLI or direct REST API calls. Please use the Firebase Console or CLI to update security rules.'
            );
          }

          case 'deploy_function': {
            const { projectId, functionName, sourceCode, trigger } = request.params.arguments as {
              projectId: string;
              functionName: string;
              sourceCode: string;
              trigger: Record<string, any>;
            };

            // Cloud Functions deployment requires Firebase CLI
            throw new McpError(
              ErrorCode.InternalError,
              'Cloud Functions deployment requires Firebase CLI'
            );
          }

          case 'get_project_config': {
            const { projectId } = request.params.arguments as {
              projectId: string;
            };

            const config = adminApp.options;

            return {
              content: [{
                type: 'text',
                text: JSON.stringify(config, null, 2)
              }]
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Firebase error: ${(error as Error).message}`
        );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Firebase MCP server running on stdio');
  }
}

const server = new FirebaseServer();
server.run().catch(console.error);
