package vault

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"errors"
	"io"
	"os"
)

type Vault struct {
	key []byte
}

func NewVault() (*Vault, error) {
	passphrase := os.Getenv("DEBUG_STUDIO_MASTER_KEY")
	if passphrase == "" {
		passphrase = "php-debug-studio-default-local-key"
	}

	hash := sha256.Sum256([]byte(passphrase))
	return &Vault{key: hash[:]}, nil
}

// Encrypt encrypts plaintext using AES-256-GCM
func (v *Vault) Encrypt(plaintext []byte) (ciphertext []byte, nonce []byte, err error) {
	block, err := aes.NewCipher(v.key)
	if err != nil {
		return nil, nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, nil, err
	}

	nonce = make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, nil, err
	}

	ciphertext = gcm.Seal(nil, nonce, plaintext, nil)
	return ciphertext, nonce, nil
}

// Decrypt decrypts ciphertext using AES-256-GCM and the supplied nonce
func (v *Vault) Decrypt(ciphertext, nonce []byte) ([]byte, error) {
	block, err := aes.NewCipher(v.key)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	if len(nonce) != gcm.NonceSize() {
		return nil, errors.New("invalid nonce size")
	}

	return gcm.Open(nil, nonce, ciphertext, nil)
}
