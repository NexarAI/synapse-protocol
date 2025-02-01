# Configuration file for Jupyter notebook

# Set options for certfile, ip, password, and port
c = get_config()

# Allow requests from any IP
c.NotebookApp.ip = '0.0.0.0'

# Do not open a browser window by default
c.NotebookApp.open_browser = False

# Set the port number
c.NotebookApp.port = 8888

# Use token authentication
c.NotebookApp.token = 'nexar'

# Allow root access
c.NotebookApp.allow_root = True

# Set the notebook directory
c.NotebookApp.notebook_dir = '/notebooks'

# Enable Jupyter Lab by default
c.NotebookApp.default_url = '/lab'

# Set the log level
c.NotebookApp.log_level = 'INFO'

# Enable auto-saving
c.FileContentsManager.autosave_interval = 120

# Set the maximum upload size to 100MB
c.NotebookApp.max_buffer_size = 100000000

# Enable Jupyter Lab extensions
c.NotebookApp.nbserver_extensions = {
    'jupyterlab': True,
    'jupyterlab_git': True
}

# Configure markdown rendering
c.NotebookApp.enable_mathjax = True

# Set the terminal shell
c.TerminalInteractiveShell.term_title = True
c.TerminalInteractiveShell.banner2 = "Welcome to Nexar AI™ Synapse Protocol Jupyter Environment"

# Configure the file browser
c.FileContentsManager.delete_to_trash = False

# Set the kernel shutdown timeout
c.MappingKernelManager.shutdown_wait_time = 10.0

# Configure the notebook format version
c.NotebookApp.nbserver_extensions = {'jupyter_nbextensions_configurator': True}

# Enable widgets
c.NotebookApp.widgets = ['jupyter-js-widgets']

# Set the culling parameters for idle kernels
c.MappingKernelManager.cull_idle_timeout = 1200
c.MappingKernelManager.cull_interval = 300
c.MappingKernelManager.cull_connected = True

# Configure authentication
c.NotebookApp.password = ''  # Token-based auth only
c.NotebookApp.password_required = False

# Configure networking
c.NotebookApp.allow_origin = '*'
c.NotebookApp.allow_credentials = True

# Set the maximum number of cells
c.NotebookApp.max_cells = 100000

# Configure the terminal
c.TerminalManager.enabled = True

# Set the working directory
import os
os.environ['JUPYTER_PATH'] = '/notebooks'

# Configure matplotlib
c.InlineBackend.figure_format = 'retina'

# Set the theme
c.JupyterLabTemplates.template_dirs = ['/notebooks/templates']
c.JupyterLabTemplates.include_default = True
c.JupyterLabTemplates.include_core_paths = True

# Configure Git integration
c.GitHubConfig.access_token = os.environ.get('GITHUB_TOKEN', '')

# Set resource limits
c.NotebookApp.resource_limits = {
    'memory': '4G',
    'cpu': 2
}

# Configure collaboration
c.NotebookApp.collaborative = True
c.NotebookApp.collaborative_url = ''

# Set up logging
c.NotebookApp.log_format = '%(asctime)s [%(levelname)s] %(message)s'
c.NotebookApp.log_datefmt = '%Y-%m-%d %H:%M:%S'

# Configure content security policy
c.NotebookApp.content_security_policy = "frame-ancestors 'self' *"

# Set up metrics collection
c.NotebookApp.collect_metrics = True

# Configure notebook checkpoints
c.FileContentsManager.checkpoints_kwargs = {
    'num_to_keep': 5,
}

# Set up terminal options
c.TerminalManager.shell_command = ['bash']

# Configure file upload size
c.NotebookApp.max_upload_size_mb = 100

# Set up notebook autosave
c.ContentsManager.allow_hidden = True

# Configure kernel culling
c.MappingKernelManager.cull_busy = False
c.MappingKernelManager.cull_idle_timeout = 3600

# Set up notebook templates
c.FileContentsManager.post_save_hook = None 
