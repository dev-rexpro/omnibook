FROM python:3.10-slim

# Create a non-root user for security and compatibility with Hugging Face Spaces
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Copy and install dependencies
COPY --chown=user requirements.txt $HOME/app/requirements.txt
RUN pip install --no-cache-dir --user -r requirements.txt

# Copy application files
COPY --chown=user . $HOME/app

# Expose Hugging Face Space port
EXPOSE 7860

# Run FastAPI app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
