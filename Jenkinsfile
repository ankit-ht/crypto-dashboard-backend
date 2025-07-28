pipeline {
  agent any

  environment {
    AWS_REGION     = 'us-east-1'
    ECR_REPO       = '016311861830.dkr.ecr.us-east-1.amazonaws.com/dev/ecom-backend'
    GITOPS_REPO    = 'https://github.com/ankit-ht/gitops-e-commerce.git'
    GITOPS_BRANCH  = 'main'
    IMAGE_TAG      = ''
  }

  stages {
    stage('Checkout Code') {
      steps {
        git url: 'https://github.com/ankit-ht/e-commerce.git', branch: 'main'
      }
    }

    stage('Build and Push Docker Image') {
      steps {
        script {
          IMAGE_TAG = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
          env.IMAGE_TAG = IMAGE_TAG  

          sh """
            echo "Logging into ECR..."
            aws ecr get-login-password --region $AWS_REGION | \
              docker login --username AWS --password-stdin $ECR_REPO

            echo "Building Docker image..."
            docker build -t $ECR_REPO:$IMAGE_TAG .

            echo "Pushing Docker image..."
            docker push $ECR_REPO:$IMAGE_TAG
          """
        }
      }
    }

    stage('Update GitOps Repo') {
      steps {
        script {
          sh """
            echo "Cloning GitOps repo..."
            git clone -b $GITOPS_BRANCH $GITOPS_REPO gitops

            cd gitops/base/ecom-backend

            echo "Updating image tag in kustomization.yaml..."
            kustomize edit set image $ECR_REPO=$ECR_REPO:$IMAGE_TAG

            git config user.name "jenkins"
            git config user.email "ankitp@heaptrace.com"
            git add .
            git commit -m "ci: update backend image to $IMAGE_TAG"
            git push origin $GITOPS_BRANCH
          """
        }
      }
    }
  }
}
